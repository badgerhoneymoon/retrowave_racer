import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BoxGeometry,
  CanvasTexture,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'

interface CitySkylineProps {
  carZ?: number
}

const BUILDING_COUNT = 120
const WRAP_LENGTH = 700 // recycle window (z range buildings live in)
const FRONT_OFFSET = 30 // buildings wrap back in just behind the camera

// Deterministic pseudo-random so the skyline is stable across frames
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

// One baked facade texture: dark concrete with scattered lit windows
function createFacadeTexture() {
  const w = 128
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#07040f'
  ctx.fillRect(0, 0, w, h)

  const cols = 8
  const rows = 20
  const cw = w / cols
  const ch = h / rows
  const palette = ['#ffd75e', '#00f0ff', '#ff2bd6', '#ff7a1a', '#8fd8ff']

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const r = seededRandom(x * 31 + y * 57)
      if (r < 0.42) continue // dark window
      const color = palette[Math.floor(seededRandom(x * 13 + y * 91) * palette.length)]
      ctx.globalAlpha = 0.35 + seededRandom(x * 71 + y * 17) * 0.65
      ctx.fillStyle = color
      ctx.fillRect(x * cw + cw * 0.22, y * ch + ch * 0.25, cw * 0.56, ch * 0.5)
    }
  }
  ctx.globalAlpha = 1

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

// Per-building static layout (deterministic)
function createLayout() {
  const layout: Array<{ x: number; z: number; w: number; h: number; d: number; rot: number }> = []
  for (let i = 0; i < BUILDING_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1
    layout.push({
      x: side * (36 + seededRandom(i * 3 + 1) * 58),
      z: -(i / BUILDING_COUNT) * WRAP_LENGTH + seededRandom(i * 7 + 2) * 12,
      w: 4 + seededRandom(i * 5 + 3) * 8,
      h: 6 + Math.pow(seededRandom(i * 11 + 4), 1.6) * 30,
      d: 4 + seededRandom(i * 13 + 5) * 8,
      rot: (seededRandom(i * 17 + 6) - 0.5) * 0.35,
    })
  }
  return layout
}

function CitySkyline({ carZ = 0 }: CitySkylineProps) {
  const meshRef = useRef<InstancedMesh>(null)

  const layout = useMemo(createLayout, [])
  const facadeTexture = useMemo(createFacadeTexture, [])

  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const sideMaterial = useMemo(
    () => new MeshBasicMaterial({ map: facadeTexture, toneMapped: false }),
    [facadeTexture]
  )
  const topMaterial = useMemo(
    () => new MeshBasicMaterial({ color: '#05030c' }),
    []
  )
  // BoxGeometry groups: [px, nx, py, ny, pz, nz]
  const materials = useMemo(
    () => [sideMaterial, sideMaterial, topMaterial, topMaterial, sideMaterial, sideMaterial],
    [sideMaterial, topMaterial]
  )

  const scratchMatrix = useMemo(() => new Matrix4(), [])
  const scratchPos = useMemo(() => new Vector3(), [])
  const scratchScale = useMemo(() => new Vector3(), [])
  const scratchQuat = useMemo(() => new Quaternion(), [])
  const yAxis = useMemo(() => new Vector3(0, 1, 0), [])
  const lastCarZRef = useRef(Number.NaN)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    // Building positions depend only on carZ — skip the 120-matrix rewrite
    // and buffer upload entirely when the car hasn't meaningfully moved
    if (Math.abs(carZ - lastCarZRef.current) < 0.02) return
    lastCarZRef.current = carZ

    for (let i = 0; i < BUILDING_COUNT; i++) {
      const b = layout[i]
      // Wrap each building through a moving window around the car. Buildings
      // stay FIXED in world space (the car drives past them) and jump 700u
      // ahead only after falling behind the camera.
      const rel = (((b.z - carZ - FRONT_OFFSET) % WRAP_LENGTH) + WRAP_LENGTH) % WRAP_LENGTH
      const z = carZ + FRONT_OFFSET - WRAP_LENGTH + rel
      scratchPos.set(b.x, b.h / 2 - 0.5, z)
      scratchScale.set(b.w, b.h, b.d)
      scratchQuat.setFromAxisAngle(yAxis, b.rot)
      scratchMatrix.compose(scratchPos, scratchQuat, scratchScale)
      mesh.setMatrixAt(i, scratchMatrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, materials, BUILDING_COUNT]}
      frustumCulled={false}
    />
  )
}

export default CitySkyline
