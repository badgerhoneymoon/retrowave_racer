import { memo, useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, BufferGeometry, Group, Matrix4, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import type { Material } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const URL = '/models/cars/hero-concept.glb'
const templates = new WeakMap<Group, Group>()
const trafficTemplates = new WeakMap<Group, Map<number, Group>>()
const trafficPaint = ['#e8e5dd', '#193b54', '#c07226', '#416257', '#9c163b', '#323b50']

function buildTemplate(scene: Group) {
  const cached = templates.get(scene)
  if (cached) return cached
  const source = scene.clone(true)
  // The reference asset is parked with 30° front-wheel steering. Straighten
  // around the source's Z-up axis before baking world transforms.
  const unsteer = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), Math.PI / 6)
  source.traverse(obj => {
    if (obj.name === 'WheelFrontL' || obj.name === 'WheelFrontR') obj.quaternion.premultiply(unsteer)
  })
  source.updateWorldMatrix(true, true)
  // Precise vertex bounds avoid the inflated boxes of rotated wheel parts.
  const bounds = new Box3().setFromObject(source, true), size = bounds.getSize(new Vector3()), center = bounds.getCenter(new Vector3())
  // Keep the unchanged 2×4 gameplay collider meaningful.
  const scale = Math.min(2 / size.x, 4 / size.z)
  const normalize = new Matrix4().makeRotationY(Math.PI)
    .multiply(new Matrix4().makeScale(scale, scale, scale))
    .multiply(new Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z))
  const buckets = new Map<string, { material: Material; geometries: BufferGeometry[] }>()
  source.traverse(obj => {
    if (!(obj instanceof Mesh)) return
    if (Array.isArray(obj.material)) throw new Error('GLTF primitive must have one material')
    const geometry = obj.geometry.clone().applyMatrix4(obj.matrixWorld).applyMatrix4(normalize)
    const key = obj.material.uuid + ':' + Object.keys(geometry.attributes).sort().join(',')
    let bucket = buckets.get(key)
    if (!bucket) {
      const material = obj.material.clone() as MeshStandardMaterial
      material.envMapIntensity = 1
      if (material.name === 'Tireside' || material.name === 'Tiretread') { material.roughness = 0.88; material.metalness = 0 }
      bucket = { material, geometries: [] }; buckets.set(key, bucket)
    }
    bucket.geometries.push(geometry)
  })
  const root = new Group()
  for (const bucket of buckets.values()) {
    const geometry = mergeGeometries(bucket.geometries, false)
    if (!geometry) throw new Error('Cannot batch concept-car geometry')
    for (const part of bucket.geometries) part.dispose()
    geometry.computeBoundingBox(); geometry.computeBoundingSphere()
    const mesh = new Mesh(geometry, bucket.material)
    mesh.castShadow = bucket.material.name !== 'Glass'; mesh.receiveShadow = true
    root.add(mesh)
  }
  templates.set(scene, root)
  return root
}

export default memo(function ConceptCar({ bodyMaterial }: { bodyMaterial: MeshPhysicalMaterial }) {
  const { scene } = useGLTF(URL, '/draco/')
  const template = useMemo(() => buildTemplate(scene), [scene])
  const instance = useMemo(() => {
    const root = template.clone(true)
    root.traverse(obj => {
      if (!(obj instanceof Mesh)) return
      const mat = obj.material as MeshPhysicalMaterial
      if (mat.name === 'Paint 1 Carmine') obj.material = mat.clone()
    })
    return root
  }, [template])
  useEffect(() => {
    instance.traverse(obj => {
      if (!(obj instanceof Mesh)) return
      const material = obj.material as MeshPhysicalMaterial
      if (material.name !== 'Paint 1 Carmine') return
      material.color.copy(bodyMaterial.color)
      material.emissive.copy(bodyMaterial.emissive)
      material.emissiveIntensity = bodyMaterial.emissiveIntensity
    })
  }, [instance, bodyMaterial])
  useEffect(() => () => instance.traverse(obj => {
    if (obj instanceof Mesh && (obj.material as Material).name === 'Paint 1 Carmine') (obj.material as Material).dispose()
  }), [instance])
  return <primitive object={instance} position={[0, -0.496, 0]} />
})

useGLTF.preload(URL, '/draco/')

// Traffic shares the exact authored geometry, textures and physical finishes
// with the player. Clones only copy nodes; each stable paint variant is shared.
export const ConceptTraffic = memo(function ConceptTraffic({ variant }: { variant: number }) {
  const { scene } = useGLTF(URL, '/draco/')
  const instance = useMemo(() => {
    const base = buildTemplate(scene)
    let variants = trafficTemplates.get(scene)
    if (!variants) { variants = new Map(); trafficTemplates.set(scene, variants) }
    const key = variant % trafficPaint.length
    let template = variants.get(key)
    if (!template) {
      template = base.clone(true)
      template.traverse(obj => {
        if (!(obj instanceof Mesh)) return
        const material = obj.material as MeshPhysicalMaterial
        if (material.name === 'Paint 1 Carmine') {
          const paint = material.clone()
          paint.color.set(trafficPaint[key]); obj.material = paint
        }
      })
      variants.set(key, template)
    }
    return template.clone(true)
  }, [scene, variant])
  // Fit the unchanged 1.8×3.5 traffic collider as well as its ground plane.
  return <primitive object={instance} position={[0, -0.496, 0]} scale={0.9} dispose={null} />
})
