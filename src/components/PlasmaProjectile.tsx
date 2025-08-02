import { useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Mesh } from 'three'

interface PlasmaProjectileProps {
  position: [number, number, number]
  angle: number
  onHit: (projectileId: string, targetPosition: [number, number, number]) => void
  onExpire: (projectileId: string) => void
  projectileId: string
  obstacles: Array<{ id: string; x: number; z: number; type: string }>
}

function PlasmaProjectile({ position, angle, onHit, onExpire, projectileId, obstacles }: PlasmaProjectileProps) {
  const projectileRef = useRef<Mesh>(null)
  const speed = 80 // Fast projectile speed
  const maxDistance = 200 // Max range before projectile expires

  useFrame((_state, delta) => {
    if (!projectileRef.current) return

    // Move projectile in the direction of the car's rotation
    const deltaX = -Math.sin(angle) * speed * delta
    const deltaZ = -Math.cos(angle) * speed * delta
    
    projectileRef.current.position.x += deltaX
    projectileRef.current.position.z += deltaZ

    // Check if projectile traveled too far (calculate total distance traveled)
    const dx = projectileRef.current.position.x - position[0]
    const dz = projectileRef.current.position.z - position[2]
    const distanceTraveled = Math.sqrt(dx * dx + dz * dz)
    
    if (distanceTraveled > maxDistance) {
      onExpire(projectileId)
      return
    }

    // Check collision with blue car obstacles only
    const currentPos = projectileRef.current.position
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
    <mesh ref={projectileRef} position={position}>
      {/* Plasma projectile core */}
      <sphereGeometry args={[0.3, 8, 6]} />
      <meshBasicMaterial 
        color="#00ffff" 
      />
      
      {/* Plasma glow effect */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 8, 6]} />
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