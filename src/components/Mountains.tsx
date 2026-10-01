import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, BufferAttribute, Group } from 'three'

interface MountainsProps {
  carZ?: number
}

// Deterministic ridge profile — layered sines give jagged but smooth peaks
function ridgeHeight(x: number, seed: number, base: number, amp: number) {
  return (
    base +
    amp * (0.55 + 0.45 * Math.sin(x * 0.045 + seed)) +
    amp * 0.45 * Math.sin(x * 0.13 + seed * 2.7) +
    amp * 0.22 * Math.sin(x * 0.31 + seed * 5.1)
  )
}

function buildRidgeGeometry(seed: number, base: number, amp: number, width: number, step: number) {
  const count = Math.floor(width / step) + 1
  const positions: number[] = []
  const indices: number[] = []

  for (let i = 0; i < count; i++) {
    const x = -width / 2 + i * step
    const h = ridgeHeight(x, seed, base, amp)
    // bottom vertex
    positions.push(x, -2, 0)
    // ridge vertex
    positions.push(x, h, 0)
  }

  for (let i = 0; i < count - 1; i++) {
    const b0 = i * 2
    const t0 = i * 2 + 1
    const b1 = i * 2 + 2
    const t1 = i * 2 + 3
    indices.push(b0, b1, t0, t0, b1, t1)
  }

  const geo = new BufferGeometry()
  geo.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function Mountains({ carZ = 0 }: MountainsProps) {
  const groupRef = useRef<Group>(null)

  const nearRidge = useMemo(() => buildRidgeGeometry(1.7, 6, 12, 500, 4), [])
  const farRidge = useMemo(() => buildRidgeGeometry(4.3, 10, 18, 600, 5), [])

  // Ridges ride the horizon, following the car smoothly (same easing as the sun)
  useFrame(() => {
    if (!groupRef.current) return
    const targetZ = carZ - 175
    groupRef.current.position.z += (targetZ - groupRef.current.position.z) * 0.1
  })

  return (
    <group ref={groupRef}>
      {/* Far ridge — taller, darker, deeper in the fog */}
      <mesh geometry={farRidge} position={[0, 0, -30]}>
        <meshBasicMaterial color="#160530" />
      </mesh>

      {/* Near ridge — silhouette with a faint neon wireframe twin */}
      <mesh geometry={nearRidge} position={[0, 0, 0]}>
        <meshBasicMaterial color="#1e0a3d" />
      </mesh>
      <mesh geometry={nearRidge} position={[0, 0.06, 0.4]}>
        <meshBasicMaterial
          color="#ff2bd6"
          wireframe
          transparent
          opacity={0.28}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default Mountains
