import { useRef, useEffect, useState, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Group,
  Vector3,
  Mesh,
  ConeGeometry,
  AdditiveBlending,
} from 'three'

import { ObstacleData } from '../utils/collision'
import MissileTrail from './MissileTrail'
import { MISSILE_BATCHES } from './CombatAssets'
import { MeshBasicMaterial } from 'three'
const PLUME_MAT=new MeshBasicMaterial({color:'#ffe3ae',transparent:true,opacity:.85,depthWrite:false,blending:AdditiveBlending,toneMapped:false})
const PLUME_GEO=new ConeGeometry(.13,1.05,12)

// Re-use across frames to avoid GC churn
const UP_VECTOR = new Vector3(0, 1, 0)
const SCRATCH_VECTOR = new Vector3()
const SCRATCH_DIRECTION = new Vector3()
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
  // Toggle to quickly enable / disable the visual trail for debugging
  const ENABLE_TRAIL = true;
  const missileRef = useRef<Group>(null)
  const plumeRef = useRef<Mesh>(null)
  const [isExploded, setIsExploded] = useState(false)
  const lifeTimeRef = useRef(0) // Track total time in flight to catch silent failures
  const positionRef = useRef(new Vector3(...position))
  const velocityRef = useRef(new Vector3())
  const frameCountRef = useRef(0)

  
  useEffect(() => {
    // Initialize missile position
    if (missileRef.current) {
      missileRef.current.position.set(...position)
    }
    
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

    velocityRef.current.set(
      -Math.sin(angle) * horizontalSpeed,
      verticalSpeed, // Proper initial upward velocity for parabola
      -Math.cos(angle) * horizontalSpeed
    )
  }, [angle, carVelocity, position])

  useFrame((_, delta) => {
    // Fail-safe: make sure a missile never silently hangs around
    lifeTimeRef.current += delta
    if (lifeTimeRef.current > 8 && !isExploded) {
      onExpire(missileId)
      return
    }

    if (isExploded || !missileRef.current) return

    frameCountRef.current++
    if(plumeRef.current){const k=1+Math.sin(lifeTimeRef.current*75)*.10;plumeRef.current.scale.set(k, k, k)}

    // Update missile position
    positionRef.current.add(
      SCRATCH_VECTOR.copy(velocityRef.current).multiplyScalar(delta)
    )

    // Apply very strong gravity for steep descent
    velocityRef.current.y -= 50 * delta

    // Update mesh position
    missileRef.current.position.copy(positionRef.current)

    // Trail handled by MissileTrail component without React state

    // Rotate missile so its nose points along the current velocity vector
    SCRATCH_DIRECTION.copy(velocityRef.current).normalize()
    if (SCRATCH_DIRECTION.lengthSq() > 0.000001) {
      missileRef.current.quaternion.setFromUnitVectors(UP_VECTOR, SCRATCH_DIRECTION)
    }

    // Check for ground collision or target reached
    if (positionRef.current.y <= 1.0) { // Higher ground detection
      // Force explosion position to ground level
      positionRef.current.y = 1.0
      // Sync the actual mesh position so we don't render one extra frame underground
      missileRef.current.position.y = 1.0
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
    // Distance can be re-enabled for debug; avoid computing to reduce work
    
    // Check if missile is way outside visible bounds (debugging)
    if (lifeTimeRef.current > 0.5) {
      const currentPos = positionRef.current
      // X-axis bounds keep missiles within road width; ignore large Z because game world scrolls endlessly.
      if (Math.abs(currentPos.x) > 50 || currentPos.y > 20 || currentPos.y < -10) {
        // If it gets well beyond the visible X range, expire it immediately
      if (Math.abs(currentPos.x) > 80 || currentPos.y < -20) {
          onExpire(missileId)
          return
        }
      }
    }
    
    // (debug) console.log('Missile distance:', distanceTraveled, 'Y position:', positionRef.current.y)
  })

  const explodeMissile = () => {
    if (isExploded) return
    
    // Instantly hide the missile mesh to avoid a lingering frame
    if (missileRef.current) {
      missileRef.current.visible = false
    }

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
    <>
      {ENABLE_TRAIL && (
        <MissileTrail
          missilePosition={positionRef.current}
          isActive={!isExploded}
        />
      )}
      <group ref={missileRef} frustumCulled={false} dispose={null}>
      {MISSILE_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} />)}
      <mesh ref={plumeRef} position={[0,-1.22,0]} rotation={[Math.PI,0,0]} geometry={PLUME_GEO} material={PLUME_MAT}/>
    </group>
    </>
  )
}

export default memo(AreaMissile)