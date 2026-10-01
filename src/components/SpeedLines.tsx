import { useMemo, useRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BoxGeometry,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  Vector3,
} from 'three'

interface SpeedLinesProps {
  // Mutable physics refs — read per frame, no React re-renders
  speedRef: MutableRefObject<number>
  carPositionRef: MutableRefObject<{ x: number; z: number }>
}

const LINE_COUNT = 48
const MAX_SPEED = 1.8 // matches HUD (speed / 1.8 * 100)

// Cheap deterministic-ish random per respawn is fine with Math.random

function SpeedLines({ speedRef, carPositionRef }: SpeedLinesProps) {
  const meshRef = useRef<InstancedMesh>(null)

  // Line state: absolute world positions, recycled as they pass behind the car
  const state = useMemo(() => {
    const arr = new Float32Array(LINE_COUNT * 4) // x, y, z, scaleSeed
    for (let i = 0; i < LINE_COUNT; i++) {
      arr[i * 4] = (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 38) // x: flanks + some center
      arr[i * 4 + 1] = 0.4 + Math.random() * 7.5 // y
      arr[i * 4 + 2] = -Math.random() * 160 // z (relative start, seeded around origin)
      arr[i * 4 + 3] = 0.5 + Math.random() // per-line length variety
    }
    return arr
  }, [])

  const scratchMatrix = useMemo(() => new Matrix4(), [])
  const scratchPos = useMemo(() => new Vector3(), [])
  const scratchScale = useMemo(() => new Vector3(), [])
  const identityQuat = useMemo(() => new Quaternion(), [])

  const geometry = useMemo(() => new BoxGeometry(0.05, 0.05, 4), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#a8f4ff',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
        fog: false,
      }),
    []
  )

  useFrame((_, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    // Boost factor: 0 below normal cruising, 1 at max boost
    const ratio = Math.min(1, Math.abs(speedRef.current) / MAX_SPEED)
    const kick = Math.max(0, ratio - 0.45) / 0.55

    // Fade global opacity toward target; sleep entirely when slow
    const targetOpacity = kick * 0.55
    const nextOpacity = material.opacity + (targetOpacity - material.opacity) * Math.min(1, delta * 6)
    material.opacity = nextOpacity

    if (nextOpacity < 0.02) {
      if (mesh.visible) mesh.visible = false
      return // zero work while cruising
    }
    if (!mesh.visible) mesh.visible = true

    const carZ = carPositionRef.current.z
    const carX = carPositionRef.current.x
    const worldSpeed = Math.abs(speedRef.current) * 60
    const lineSpeed = worldSpeed * 1.35 + 25 // streaks rush past the car
    const stretch = 0.6 + kick * 1.8

    for (let i = 0; i < LINE_COUNT; i++) {
      const o = i * 4
      state[o + 2] += lineSpeed * delta

      // Recycle far behind → far ahead with fresh lateral slot
      if (state[o + 2] > carZ + 14) {
        state[o + 2] = carZ - 110 - Math.random() * 60
        state[o] = carX + (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 38)
        state[o + 1] = 0.4 + Math.random() * 7.5
      }

      scratchPos.set(state[o], state[o + 1], state[o + 2])
      scratchScale.set(1, 1, stretch * state[o + 3])
      scratchMatrix.compose(scratchPos, identityQuat, scratchScale)
      mesh.setMatrixAt(i, scratchMatrix)
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, LINE_COUNT]}
      frustumCulled={false}
      visible={false}
    />
  )
}

export default SpeedLines
