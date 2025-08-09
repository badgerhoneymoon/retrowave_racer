import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Group,
  Vector3,
  BufferGeometry,
  BufferAttribute,
  InstancedMesh,
  Matrix4,
  SphereGeometry,
  MeshStandardMaterial,
  Quaternion,
} from 'three'

interface MissileTrailProps {
  missilePosition: Vector3
  isActive: boolean
}

const MAX_TRAIL_POINTS = 20

function MissileTrail({ missilePosition, isActive }: MissileTrailProps) {
  const trailRef = useRef<Group>(null)
  const frameCountRef = useRef(0)
  const instancedRef = useRef<InstancedMesh>(null)
  const scratchMatrix = useMemo(() => new Matrix4(), [])
  const scratchPosition = useMemo(() => new Vector3(), [])
  const scratchScale = useMemo(() => new Vector3(1, 1, 1), [])
  const scratchQuaternion = useMemo(() => new Quaternion(), [])
  const ringBuffer = useMemo(() => new Float32Array(MAX_TRAIL_POINTS * 3), [])
  const headRef = useRef(-1)
  const countRef = useRef(0)
  
  // Create geometry with dynamic positions
  const lineGeometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(MAX_TRAIL_POINTS * 3)
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [])

  const sphereGeometry = useMemo(() => new SphereGeometry(0.15), [])
  const sphereMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ff6600',
        emissive: '#ff4400',
        emissiveIntensity: 1.5,
        transparent: true,
        opacity: 0.8,
      }),
    []
  )

  useFrame(() => {
    if (!isActive || !trailRef.current) return

    frameCountRef.current++
    
    // Update trail every 2 frames for performance
    if (frameCountRef.current % 2 === 0) {
      // Write to ring buffer (avoid allocations)
      headRef.current = (headRef.current + 1) % MAX_TRAIL_POINTS
      const head = headRef.current
      ringBuffer[head * 3] = missilePosition.x
      ringBuffer[head * 3 + 1] = missilePosition.y
      ringBuffer[head * 3 + 2] = missilePosition.z
      if (countRef.current < MAX_TRAIL_POINTS) countRef.current += 1
      
      // Update geometry positions
      const positions = lineGeometry.attributes.position.array as Float32Array
      const count = countRef.current
      for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
        const srcIndex = (headRef.current - i + MAX_TRAIL_POINTS) % MAX_TRAIL_POINTS
        const dest = i * 3
        if (i < count) {
          positions[dest] = ringBuffer[srcIndex * 3]
          positions[dest + 1] = ringBuffer[srcIndex * 3 + 1]
          positions[dest + 2] = ringBuffer[srcIndex * 3 + 2]
        } else {
          // duplicate last written position to avoid wild segments
          positions[dest] = positions[(dest - 3 + positions.length) % positions.length]
          positions[dest + 1] = positions[(dest - 3 + positions.length) % positions.length + 1]
          positions[dest + 2] = positions[(dest - 3 + positions.length) % positions.length + 2]
        }
      }
      
      lineGeometry.attributes.position.needsUpdate = true

      // Update instanced particle transforms (no React state)
      const mesh = instancedRef.current
      if (mesh) {
        for (let i = 0; i < MAX_TRAIL_POINTS; i++) {
          if (i < count) {
            // Fade scale along the trail
            const t = 1 - i / MAX_TRAIL_POINTS
            const srcIndex = (headRef.current - i + MAX_TRAIL_POINTS) % MAX_TRAIL_POINTS
            const px = ringBuffer[srcIndex * 3]
            const py = ringBuffer[srcIndex * 3 + 1]
            const pz = ringBuffer[srcIndex * 3 + 2]
            scratchPosition.set(px, py, pz)
            scratchScale.set(0.2 * t, 0.2 * t, 0.2 * t)
            scratchMatrix.compose(scratchPosition, scratchQuaternion, scratchScale)
            mesh.setMatrixAt(i, scratchMatrix)
          } else {
            // Move unused instances out of view
            scratchMatrix.makeTranslation(0, -9999, 0)
            mesh.setMatrixAt(i, scratchMatrix)
          }
        }
        mesh.instanceMatrix.needsUpdate = true
      }
    }
  })

  if (!isActive) return null

  return (
    <group ref={trailRef}>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial 
          color="#ff4400" 
          transparent 
          opacity={0.6}
          linewidth={2}
        />
      </lineSegments>
      <instancedMesh
        ref={instancedRef}
        args={[sphereGeometry, sphereMaterial, MAX_TRAIL_POINTS]}
        frustumCulled={false}
      />
    </group>
  )
}

export default MissileTrail