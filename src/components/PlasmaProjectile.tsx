import { useRef, memo, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'
import { geometryCache } from '../utils/geometryCache'

interface PlasmaProjectileProps {
  position: [number, number, number]
  angle: number
  carVelocity: number
  onHit: (projectileId: string, targetPosition: [number, number, number]) => void
  onExpire: (projectileId: string) => void
  projectileId: string
  obstacles: Array<{ id: string; x: number; z: number; type: string }>
}

function PlasmaProjectile({ position, angle, carVelocity, onHit, onExpire, projectileId, obstacles }: PlasmaProjectileProps) {
  const projectileRef = useRef<Mesh>(null)
  const baseSpeed = 80 // Base projectile speed
  const maxDistance = 200 // Max range before projectile expires

  // Pre-compute trigonometry for performance (angle doesn't change per projectile)
  const { sinAngle, cosAngle } = useMemo(() => ({
    sinAngle: Math.sin(angle),
    cosAngle: Math.cos(angle)
  }), [angle])

  useFrame((_state, delta) => {
    if (!projectileRef.current) return

    // Add car velocity to projectile speed for realistic physics
    // Convert car velocity from units/frame to units/second (multiply by ~60)
    const carVelocityInWorldUnits = carVelocity * 60
    const effectiveSpeed = baseSpeed + carVelocityInWorldUnits

    // Move projectile in the direction of the car's rotation
    const deltaX = -sinAngle * effectiveSpeed * delta
    const deltaZ = -cosAngle * effectiveSpeed * delta
    
    projectileRef.current.position.x += deltaX
    projectileRef.current.position.z += deltaZ

    // Check if projectile traveled too far (calculate total distance traveled)
    const dx = projectileRef.current.position.x - position[0]
    const dz = projectileRef.current.position.z - position[2]
    const distanceTraveled = Math.sqrt(dx * dx + dz * dz)
    
    // Also check if projectile is way out of bounds (safety net)
    const currentPos = projectileRef.current.position
    const tooFarOut = Math.abs(currentPos.x) > 100 || Math.abs(currentPos.z - position[2]) > maxDistance
    
    if (distanceTraveled > maxDistance || tooFarOut) {
      onExpire(projectileId)
      return
    }

    // Check collision with blue car obstacles only
    for (const obstacle of obstacles) {
      if (obstacle.type === 'car') { // Only blue cars can be destroyed
        const dx = Math.abs(currentPos.x - obstacle.x)
        const dz = Math.abs(currentPos.z - obstacle.z)
        
        // Simple collision detection
        if (dx < 2 && dz < 3) {
          onHit(projectileId, [obstacle.x, 1, obstacle.z])
          return
        }
      }
    }
  })

  return (
    <mesh ref={projectileRef} position={position} geometry={geometryCache.getGeometry('plasma-core')}>
      {/* Plasma projectile core */}
      <meshBasicMaterial 
        color="#00ffff" 
      />
      
      {/* Plasma glow effect */}
      <mesh position={[0, 0, 0]} geometry={geometryCache.getGeometry('plasma-glow')}>
        <meshBasicMaterial 
          color="#00ffff" 
          transparent
          opacity={0.3}
        />
      </mesh>
    </mesh>
  )
}

export default memo(PlasmaProjectile)