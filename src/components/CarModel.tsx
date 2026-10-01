import { memo, Suspense, useEffect, useMemo, useRef } from 'react'
import { Clone, useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { BufferGeometry, Box3, Color, Group, Material, Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three'

// ---------------------------------------------------------------------------
// Downloaded GLB car models (see public/models/cars/CREDITS.md for licenses).
//
// Templates are built once per (url, tint) and cached module-level: obstacles
// mount/unmount constantly while driving, so geometry AND materials must be
// shared across all instances of a variant — Clone copies nodes only.
// ---------------------------------------------------------------------------

const HERO_URL = '/models/cars/hero-80s.glb'
const POLICE_URL = '/models/cars/enemy-police.glb'
const MUSCLE_URL = '/models/cars/enemy-muscle.glb'
const SEDAN_URL = '/models/cars/enemy-sedan.glb'
const SPORTS_URL = '/models/cars/enemy-sports.glb'

interface EnemyVariant {
  url: string
  tint: string | null
  tintableMaterial: string | null
}

// Distinct silhouettes + colors; the two tinted entries recolor the sedan's
// 'Blue' and the sports car's 'White' body paint for extra variety.
const ENEMY_VARIANTS: EnemyVariant[] = [
  { url: POLICE_URL, tint: null, tintableMaterial: 'White' },
  { url: MUSCLE_URL, tint: null, tintableMaterial: null }, // textured atlas — no tint
  { url: SEDAN_URL, tint: null, tintableMaterial: 'Blue' },
  { url: SPORTS_URL, tint: null, tintableMaterial: 'White' },
  { url: SEDAN_URL, tint: '#e8354f', tintableMaterial: 'Blue' },
  { url: SPORTS_URL, tint: '#29c4ff', tintableMaterial: 'White' },
]

export const ENEMY_VARIANT_COUNT = ENEMY_VARIANTS.length

const HERO_LENGTH = 4.4
const ENEMY_LENGTH = 4.2

const LIGHT_MAT = /headlight|taillight|brakelight|whitelights|bluelights/i
const HEADLIGHT_MAT = /headlight/i
const GLASS_MAT = /window|glass/i

// Hero material name → role. The 80s-car GLB uses Blender-style 'matN' names.
const HERO_MAT_ROLES: Record<string, string> = {
  mat2: 'hero-body',
  mat1: 'hero-body',
  mat17: 'hero-glass',
  mat25: 'hero-glass',
  mat14: 'hero-tail',
  mat8: 'hero-tail',
  mat15: 'hero-tail',
  mat23: 'hero-tire',
  mat22: 'hero-rim',
}

interface TemplateOptions {
  url: string
  targetLength: number
  isHero: boolean
  tint?: string | null
  tintableMaterial?: string | null
  // Non-uniform proportion tweaks (hero: slightly lower, slightly wider stance)
  squashX?: number
  squashY?: number
}

const templateCache = new Map<string, Group>()

function prepareTemplate(source: Object3D, opts: TemplateOptions): Group {
  const inner = source.clone(true)
  inner.updateWorldMatrix(true, true)

  // Front detection: enemy models point wherever the artist left them.
  // Headlights mark the front — rotate so the nose always faces -Z.
  let yaw = 0
  if (!opts.isHero) {
    const fullCenter = new Box3().setFromObject(inner).getCenter(new Vector3())
    let lightZ = 0
    let lightCount = 0
    const meshBox = new Box3()
    const meshCenter = new Vector3()
    inner.traverse(obj => {
      const mesh = obj as Mesh
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      if (mats.some(m => m && HEADLIGHT_MAT.test(m.name))) {
        meshBox.setFromObject(mesh)
        meshBox.getCenter(meshCenter)
        lightZ += meshCenter.z
        lightCount += 1
      }
    })
    // Front at +Z (Quaternius convention) → flip to face -Z
    if (lightCount === 0 || lightZ / lightCount > fullCenter.z) yaw = Math.PI
  }

  const yawGroup = new Group()
  yawGroup.add(inner)
  inner.rotation.y = yaw
  yawGroup.updateWorldMatrix(true, true)

  // Normalize: exact length along Z, centered, wheels on y=0
  const box = new Box3().setFromObject(yawGroup)
  const size = box.getSize(new Vector3())
  const scale = opts.targetLength / Math.max(size.z, 0.0001)
  yawGroup.scale.set(scale * (opts.squashX ?? 1), scale * (opts.squashY ?? 1), scale)
  yawGroup.updateWorldMatrix(true, true)
  box.setFromObject(yawGroup)
  const center = box.getCenter(new Vector3())
  yawGroup.position.set(-center.x, -box.min.y, -center.z)

  const template = new Group()
  template.add(yawGroup)

  // Material pass — clones per template so tints/roles never leak across variants
  template.traverse(obj => {
    const mesh = obj as Mesh
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
    const src = mesh.material as MeshStandardMaterial
    if (!src) return
    const name = src.name || ''

    if (opts.isHero) {
      const role = HERO_MAT_ROLES[name]
      const m = src.clone()
      // Renamed by role; HeroCarModel assigns the live materials by this name
      m.name = role || 'hero-trim'
      mesh.userData.role = m.name
      mesh.material = m
      return
    }

    const m = src.clone()
    if (LIGHT_MAT.test(name)) {
      // Real lights that bloom
      m.emissive = new Color().copy(m.color)
      m.emissiveIntensity = 2.2
      m.toneMapped = false
    } else if (GLASS_MAT.test(name)) {
      m.metalness = 0.9
      m.roughness = 0.12
    } else if (opts.tintableMaterial && name === opts.tintableMaterial) {
      // Body paint — optional recolor + a wet shine from the HDRI env
      if (opts.tint) m.color.set(opts.tint)
      m.metalness = 0.55
      m.roughness = 0.32
    } else if (name === 'Atlas') {
      // Textured muscle car body — shine without touching the paint
      m.metalness = 0.35
      m.roughness = 0.45
    }
    mesh.material = m
  })

  if (opts.isHero) {
    // The car is static geometry: bake its node transforms once and merge by
    // visual role. Keep every triangle and all state-driven material changes.
    template.updateWorldMatrix(true, true)
    const batches = new Map<string, { material: Material; geometries: BufferGeometry[] }>()
    template.traverse(obj => {
      const mesh = obj as Mesh
      if (!mesh.isMesh) return
      const material = mesh.material as Material
      const role = mesh.userData.role as string
      const batch = batches.get(role) ?? { material, geometries: [] }
      batch.geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld))
      batches.set(role, batch)
    })
    const merged = new Group()
    for (const [role, batch] of batches) {
      const geometry = mergeGeometries(batch.geometries)
      batch.geometries.forEach(g => g.dispose())
      if (!geometry) throw new Error(`Could not merge hero geometry: ${role}`)
      const mesh = new Mesh(geometry, batch.material)
      mesh.userData.role = role
      merged.add(mesh)
    }
    return merged
  }
  return template
}

function useCarTemplate(opts: TemplateOptions): Group {
  const { scene } = useGLTF(opts.url)
  return useMemo(() => {
    const key = `${opts.url}|${opts.tint ?? ''}|${opts.isHero ? 'hero' : 'enemy'}`
    const cached = templateCache.get(key)
    if (cached) return cached
    const built = prepareTemplate(scene, opts)
    templateCache.set(key, built)
    return built
  }, [scene, opts.url, opts.tint, opts.isHero, opts.targetLength, opts.tintableMaterial, opts.squashX, opts.squashY])
}

// ---------------------------------------------------------------------------
// Enemy car — one of N variants, chosen per obstacle
// ---------------------------------------------------------------------------

function EnemyCarInner({ variant }: { variant: number }) {
  const spec = ENEMY_VARIANTS[variant % ENEMY_VARIANTS.length]
  const template = useCarTemplate({
    url: spec.url,
    targetLength: ENEMY_LENGTH,
    isHero: false,
    tint: spec.tint,
    tintableMaterial: spec.tintableMaterial,
  })
  return <Clone object={template} />
}

export const EnemyCarModel = memo(function EnemyCarModel({ variant }: { variant: number }) {
  return (
    <Suspense fallback={null}>
      <EnemyCarInner variant={variant} />
    </Suspense>
  )
})

// ---------------------------------------------------------------------------
// Hero (player) car — GLB body, but materials come from CarVisual so the
// state-driven recolors (collision flash, boost, powerups) keep working
// ---------------------------------------------------------------------------

interface HeroCarModelProps {
  bodyMaterial: Material
  glassMaterial: Material
  tireMaterial: Material
  rimMaterial: Material
  tailMaterial: Material
}

function HeroCarInner({ bodyMaterial, glassMaterial, tireMaterial, rimMaterial, tailMaterial }: HeroCarModelProps) {
  const template = useCarTemplate({
    url: HERO_URL,
    targetLength: HERO_LENGTH,
    isHero: true,
    squashX: 1.06,
    squashY: 0.85,
  })
  const instanceRef = useRef<Group>(null)

  // Assign live materials by role name (re-runs when CarVisual swaps materials)
  useEffect(() => {
    const root = instanceRef.current
    if (!root) return
    root.traverse(obj => {
      const mesh = obj as Mesh
      if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return
      const role = mesh.userData.role as string
      switch (role) {
        case 'hero-body':
          mesh.material = bodyMaterial
          break
        case 'hero-glass':
          mesh.material = glassMaterial
          break
        case 'hero-tire':
          mesh.material = tireMaterial
          break
        case 'hero-rim':
          mesh.material = rimMaterial
          break
        case 'hero-tail':
          mesh.material = tailMaterial
          break
      }
    })
  }, [bodyMaterial, glassMaterial, tireMaterial, rimMaterial, tailMaterial])

  return <Clone ref={instanceRef} object={template} />
}

export const HeroCarModel = memo(function HeroCarModel(props: HeroCarModelProps) {
  return (
    <Suspense fallback={null}>
      <HeroCarInner {...props} />
    </Suspense>
  )
})

// Start loading everything immediately — enemies spawn mid-game and must
// never suspend the obstacle list
useGLTF.preload(HERO_URL)
useGLTF.preload(POLICE_URL)
useGLTF.preload(MUSCLE_URL)
useGLTF.preload(SEDAN_URL)
useGLTF.preload(SPORTS_URL)
