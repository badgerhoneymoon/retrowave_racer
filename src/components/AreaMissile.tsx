import { useRef, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3 } from 'three'

import { ObstacleData } from '../utils/collision'

// Re-use across frames to avoid GC churn
const UP_VECTOR = new Vector3(0, 1, 0)

interface AreaMissileProps {
  position: [number, number, number]
  angle: number
  carVelocity: number
  missileId: string
  obstacles: ObstacleData[]
  onHit: (missileId: string, explosionCenter: [number, number, number], hitObstacleIds: string[]) => void
  onExpire: (missileId: string) => void
}

function AreaMissile({ 
  position, 
  angle, 
  carVelocity, 
  missileId, 
  obstacles, 
  onHit, 
  onExpire 
}: AreaMissileProps) {
  const missileRef = useRef<Group>(null)
  const [isExploded, setIsExploded] = useState(false)
  const lifeTimeRef = useRef(0) // Track total time in flight to catch silent failures
  const positionRef = useRef(new Vector3(...position))
  const velocityRef = useRef(new Vector3())
  
  useEffect(() => {
    // --- Improved ballistic solution ---
    // We want the missile to land roughly 45 units in front of the car and
    // also compensate a little for the car velocity so it never lands on top
    // of the player.
    const gravity = 50                       // Keep this in sync with the frame update gravity
    const desiredRange = 45                  // How far ahead (in world units) the missile should impact
    const verticalSpeed = 25                 // Initial upward velocity (tweak for arc height)

    // Time it will take to come back down to y≈0 given the chosen vertical speed.
    // Formula derived from s = v*t + 0.5*a*t^2 solving for t when s≈0.
    const flightTime = (verticalSpeed + Math.sqrt(verticalSpeed * verticalSpeed + 2 * gravity)) / gravity

    // Solve for horizontal velocity so that horizontalSpeed * flightTime ≈ desiredRange.
    // We also inject a fraction of current car velocity so the missile leads the target when moving fast.
    // Convert car forward velocity into world-units-per-second (carVelocity is scaled in Car.tsx by *60 each frame)
    const carForwardSpeed = Math.abs(carVelocity) * 60
    // Guarantee the missile is always faster than the player by a clear margin
    const horizontalSpeed = carForwardSpeed + (desiredRange / flightTime) + 15

    console.log('Missile launched with:', {
      horizontalSpeed,
      verticalSpeed,
      flightTime,
      carVelocity,
      startPosition: position
    })
    

    
    velocityRef.current.set(
      -Math.sin(angle) * horizontalSpeed,
      verticalSpeed, // Proper initial upward velocity for parabola
      -Math.cos(angle) * horizontalSpeed
    )
  }, [angle, carVelocity])

  useFrame((_, delta) => {
    // Fail-safe: make sure a missile never silently hangs around
    lifeTimeRef.current += delta
    if (lifeTimeRef.current > 8 && !isExploded) {
      console.warn('⏰ Failsafe missile timeout – forcing expire', missileId)
      onExpire(missileId)
      return
    }

    if (isExploded || !missileRef.current) return

    // Update missile position
    positionRef.current.add(
      velocityRef.current.clone().multiplyScalar(delta)
    )

    // Apply very strong gravity for steep descent
    velocityRef.current.y -= 50 * delta

    // Update mesh position
    missileRef.current.position.copy(positionRef.current)

    // Rotate missile so its nose points along the current velocity vector
    const dir = velocityRef.current.clone().normalize()
    if (dir.lengthSq() > 0.000001) {
      missileRef.current.quaternion.setFromUnitVectors(UP_VECTOR, dir)
    }

    // Check for ground collision or target reached
    if (positionRef.current.y <= 1.0) { // Higher ground detection
      // Force explosion position to ground level
      positionRef.current.y = 1.0
      explodeMissile()
      return
    }

    // Temporarily disable mid-air collision for debugging
    // Check for obstacle collision during flight
    // const missileX = positionRef.current.x
    // const missileZ = positionRef.current.z
    
    // for (const obstacle of obstacles) {
    //   const dx = Math.abs(obstacle.x - missileX)
    //   const dz = Math.abs(obstacle.z - missileZ)
    //   
    //   // Direct hit detection (smaller radius for direct impact)
    //   if (dx < 2 && dz < 3 && obstacle.type === 'car') {
    //     console.log('Missile hit obstacle in mid-air')
    //     explodeMissile()
    //     return
    //   }
    // }

    // Auto-expire if missile travels too far (reasonable range)
    const distanceTraveled = Math.sqrt(
      Math.pow(positionRef.current.x - position[0], 2) +
      Math.pow(positionRef.current.z - position[2], 2)
    )
    
    // Check if missile is way outside visible bounds (debugging)
    if (lifeTimeRef.current > 0.5) {
      const currentPos = positionRef.current
      if (Math.abs(currentPos.x) > 50 || Math.abs(currentPos.z) > 200 || currentPos.y > 20 || currentPos.y < -10) {
        console.warn('⚠️ Missile outside typical bounds:', {
          x: currentPos.x,
          y: currentPos.y,
          z: currentPos.z,
          distance: distanceTraveled
        })

        // If it gets well beyond the visible world, expire it immediately
        if (Math.abs(currentPos.x) > 80 || Math.abs(currentPos.z) > 300 || currentPos.y < -20) {
          onExpire(missileId)
          return
        }
      }
    }
    
    // (debug) console.log('Missile distance:', distanceTraveled, 'Y position:', positionRef.current.y)

    if (distanceTraveled > 120) {
      console.log('Missile expired due to distance limit')
      onExpire(missileId)
    }
  })

  const explodeMissile = () => {
    if (isExploded) return
    
    console.log('Missile exploding at position:', positionRef.current.x, positionRef.current.y, positionRef.current.z)
    setIsExploded(true)
    
    // Find all obstacles within explosion radius
    // Match damage radius to visual blast (MissileExplosion grows to ~12 units)
    const explosionRadius = 12 // Increased AoE to match visuals
    const explosionCenter: [number, number, number] = [
      positionRef.current.x,
      1.0, // Ensure explosion is at ground level
      positionRef.current.z
    ]
    
    const hitObstacleIds: string[] = []
    
    for (const obstacle of obstacles) {
      const dx = Math.abs(obstacle.x - explosionCenter[0])
      const dz = Math.abs(obstacle.z - explosionCenter[2])
      const distance = Math.sqrt(dx * dx + dz * dz)
      
      if (distance <= explosionRadius && obstacle.type === 'car') {
        hitObstacleIds.push(obstacle.id)
      }
    }
    
    // Trigger explosion with all hit obstacles
    onHit(missileId, explosionCenter, hitObstacleIds)
  }

  if (isExploded) return null

  return (
    <group ref={missileRef} position={position} frustumCulled={false}>
      {/* Main missile body */}
      <mesh position={[0, 0, 0]} frustumCulled={false}>
        <cylinderGeometry args={[0.15, 0.3, 1.5]} />
        <meshStandardMaterial 
          color="#ff0040" 
          emissive="#ff0040" 
          emissiveIntensity={0.3}
        />
      </mesh>
      
      {/* Missile nose cone */}
      <mesh position={[0, 0.75, 0]} frustumCulled={false}>
        <coneGeometry args={[0.15, 0.5]} />
        <meshStandardMaterial 
          color="#ffff00" 
          emissive="#ffff00" 
          emissiveIntensity={0.5}
        />
      </mesh>
      
      {/* Missile fins */}
      <mesh position={[0.3, -0.5, 0]} rotation={[0, 0, Math.PI / 4]} frustumCulled={false}>
        <boxGeometry args={[0.1, 0.4, 0.05]} />
        <meshStandardMaterial color="#ff6600" />
      </mesh>
      <mesh position={[-0.3, -0.5, 0]} rotation={[0, 0, -Math.PI / 4]} frustumCulled={false}>
        <boxGeometry args={[0.1, 0.4, 0.05]} />
        <meshStandardMaterial color="#ff6600" />
      </mesh>
      
      {/* Thruster glow */}
      <mesh position={[0, -1, 0]} frustumCulled={false}>
        <sphereGeometry args={[0.3]} />
        <meshStandardMaterial 
          color="#00ffff" 
          emissive="#00ffff" 
          emissiveIntensity={1.5}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Trail effect */}
      <mesh position={[0, -1.5, 0]} frustumCulled={false}>
        <sphereGeometry args={[0.15]} />
        <meshStandardMaterial 
          color="#ff4400" 
          emissive="#ff4400" 
          emissiveIntensity={1.0}
          transparent
          opacity={0.6}
        />
      </mesh>
      
      {/* Particle trail effect */}
      <pointLight 
        position={[0, -0.5, 0]} 
        intensity={3} 
        distance={8} 
        color="#00ffff" 
      />
      
      {/* Landing indicator light (projected ahead) */}
      <pointLight 
        position={[0, -2, 0]} 
        intensity={2} 
        distance={15} 
        color="#ff0000" 
      />
    </group>
  )
}

export default AreaMissile