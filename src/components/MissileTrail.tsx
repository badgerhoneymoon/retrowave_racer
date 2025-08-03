import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, BufferGeometry, BufferAttribute } from 'three'

interface MissileTrailProps {
  missilePosition: Vector3
  isActive: boolean
}

const MAX_TRAIL_POINTS = 20

function MissileTrail({ missilePosition, isActive }: MissileTrailProps) {
  const trailRef = useRef<Group>(null)
  const positionsRef = useRef<Vector3[]>([])
  const frameCountRef = useRef(0)
  
  // Create geometry with dynamic positions
  const geometry = useMemo(() => {
    const geo = new BufferGeometry()
    const positions = new Float32Array(MAX_TRAIL_POINTS * 3)
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [])

  useFrame(() => {
    if (!isActive || !trailRef.current) return

    frameCountRef.current++
    
    // Update trail every 2 frames for performance
    if (frameCountRef.current % 2 === 0) {
      // Add new position to trail
      positionsRef.current.unshift(missilePosition.clone())
      
      // Limit trail length
      if (positionsRef.current.length > MAX_TRAIL_POINTS) {
        positionsRef.current.pop()
      }
      
      // Update geometry positions
      const positions = geometry.attributes.position.array as Float32Array
      positionsRef.current.forEach((pos, i) => {
        positions[i * 3] = pos.x
        positions[i * 3 + 1] = pos.y
        positions[i * 3 + 2] = pos.z
      })
      
      geometry.attributes.position.needsUpdate = true
    }
  })

  if (!isActive) return null

  return (
    <group ref={trailRef}>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial 
          color="#ff4400" 
          transparent 
          opacity={0.6}
          linewidth={2}
        />
      </lineSegments>
      
      {/* Trail particles */}
      {positionsRef.current.map((pos, i) => (
        <mesh key={i} position={pos} frustumCulled={false}>
          <sphereGeometry args={[0.1 * (1 - i / MAX_TRAIL_POINTS)]} />
          <meshStandardMaterial
            color="#ff6600"
            emissive="#ff4400"
            emissiveIntensity={1.5 * (1 - i / MAX_TRAIL_POINTS)}
            transparent
            opacity={0.8 * (1 - i / MAX_TRAIL_POINTS)}
          />
        </mesh>
      ))}
    </group>
  )
}

export default MissileTrail