import { useRef, useState, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, PerspectiveCamera } from 'three'
import { ObstacleData, checkCollisions, getObstaclesInRange } from '../utils/collision'
import { useCarWeapons } from '../hooks/useCarWeapons'
import { useCarPhysics } from '../hooks/useCarPhysics'
import { useCarPowerups } from '../hooks/useCarPowerups'
import { useCarHUD } from '../hooks/useCarHUD'
import CarVisual from './CarVisual'
import SpeedLines from './SpeedLines'
import { followMovingTarget, WorldPositionRef } from '../utils/motion'
import { toggleSound } from '../utils/audio'
import { acceptsGameplayKey, HELD_BINDINGS, HeldAction } from '../utils/controls'

interface CarProps {
  worldPositionRef: WorldPositionRef
  position?: [number, number, number]
  onSpeedChange?: (speed: number) => void
  onPositionChange?: (position: { x: number, z: number }) => void
  onDistanceChange?: (distance: number) => void
  obstacles?: ObstacleData[]
  onObstacleCollected?: (obstacleId: string) => void
  onRewardCollected?: (points: number, position: [number, number, number]) => void
  onShoot?: (startPosition: [number, number, number], angle: number, carVelocity: number) => void
  onSpreadShoot?: (shots: Array<{ position: [number, number, number], angle: number, carVelocity: number }>) => void
  onMissileShoot?: (startPosition: [number, number, number], angle: number, carVelocity: number) => void
  score?: number
  onScoreUpdate?: (newScore: number) => void
  onEnemyCarBounce?: (obstacleId: string, newVelocity: number, bounceDistance: number) => void
  onPlayerCrash?: (position: [number, number, number]) => void
}

function Car({ worldPositionRef, position = [0, 0, 0], onPositionChange, obstacles = [], onObstacleCollected, onRewardCollected, onShoot, onSpreadShoot, onMissileShoot, score = 0, onScoreUpdate, onEnemyCarBounce, onPlayerCrash }: CarProps) {
  const carRef = useRef<Group>(null)
  const shakeRef = useRef(0) // camera impact shake amplitude (ref: no re-renders)
  const previousCameraTarget = useRef({ x: 0, y: 4, z: 6 })
  const rollRef = useRef(0) // camera banking angle (ref: no re-renders)
  
  // Hooks
  const physics = useCarPhysics()
  const powerups = useCarPowerups()
  const weapons = useCarWeapons({
    score,
    onShoot,
    onSpreadShoot,
    onMissileShoot
  })
  const hud = useCarHUD()
  
  const [isColliding, setIsColliding] = useState(false)
  // Track last position sent to parent to avoid spamming state updates
  const lastSentPositionRef = useRef({ x: 0, z: 0 })
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
    missile: false
  })

  useEffect(() => {
    const pressed = new Set<string>()
    const refreshAction = (action: HeldAction) => {
      keysRef.current[action] = [...pressed].some(code => HELD_BINDINGS[code] === action)
    }
    const clear = () => {
      pressed.clear()
      for (const action of Object.keys(keysRef.current) as HeldAction[]) keysRef.current[action] = false
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!acceptsGameplayKey(event)) return
      const action = HELD_BINDINGS[event.code]
      if (action) {
        event.preventDefault()
        pressed.add(event.code)
        refreshAction(action)
      } else if (event.code === 'KeyR' && !event.repeat) {
        event.preventDefault()
        toggleSound()
      }
    }
    const handleKeyUp = (event: KeyboardEvent) => {
      const action = HELD_BINDINGS[event.code]
      if (!action) return
      pressed.delete(event.code)
      refreshAction(action)
      if (acceptsGameplayKey(event)) event.preventDefault()
    }
    const handleVisibility = () => { if (document.hidden) clear() }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', clear)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clear()
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', clear)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  useFrame((state, delta) => {
    if (!carRef.current) return

    const keys = keysRef.current

    // Cache initial trigonometric calculations (will be updated after rotation)

    const currentTime = state.clock.elapsedTime * 1000
    
    // Update systems
    weapons.updateSpreadShot(currentTime)
    weapons.updateTripleRocketMode(currentTime)
    const boostTransitionSpeed = powerups.updateBoost(currentTime, delta)
    
    // Handle shooting
    if (keys.shoot) {
      weapons.handleShoot(currentTime, physics.carPositionRef.current, physics.carRotationRef.current, physics.speedRef.current)
    }
    
    // Handle missile shooting
    if (keys.missile) {
      weapons.handleMissileShoot(currentTime, physics.carPositionRef.current, physics.carRotationRef.current, physics.speedRef.current)
    }

    // Update physics using the hook
    const { newX, newZ } = physics.updatePhysics({
      boostTransitionSpeed,
      delta,
      keys
    })
      
    // Check for collisions at new position
    const nearbyObstacles = getObstaclesInRange(obstacles, newX, newZ, 10)
    const collision = checkCollisions(newX, newZ, nearbyObstacles, physics.speedRef.current)
    
    if (collision.hit) {
      if (collision.isBoost) {
        // Speed boost collected!
        powerups.collectBoost(currentTime)
        setIsColliding(false)
        
        // Remove the collected boost obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for boost items
        physics.updatePosition(newX, newZ)
      } else if (collision.isReward) {
        // Reward collected!
        const points = 100 // Base points for reward
        if (onScoreUpdate) {
          onScoreUpdate(score + points)
        }
        setIsColliding(false)
        
        // Trigger explosion effect callback with reward position
        if (onRewardCollected && collision.obstacle) {
          onRewardCollected(points, [collision.obstacle.x, 1, collision.obstacle.z])
        }
        
        // Remove the collected reward obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for rewards
        physics.updatePosition(newX, newZ)
      } else if (collision.isRocketLauncher) {
        // Rocket launcher collected!
        weapons.addMissiles(5) // Add 5 missiles to current count (accumulate)
        setIsColliding(false)
        
        // Remove the collected rocket launcher obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for rocket launcher
        physics.updatePosition(newX, newZ)
      } else if (collision.isTripleRocket) {
        // Triple rocket mode collected!
        weapons.activateTripleRocketMode(currentTime)
        setIsColliding(false)
        
        // Remove the collected triple rocket obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for triple rocket
        physics.updatePosition(newX, newZ)
      } else {
        // Regular collision - bounce along the contact normal
        setIsColliding(true)

        // Handle enemy car bounce if collision data includes it
        if (collision.enemyCarBounce && onEnemyCarBounce && collision.obstacle) {
          onEnemyCarBounce(
            collision.obstacle.id,
            collision.enemyCarBounce.newVelocity,
            collision.enemyCarBounce.bounceDistance
          )
        }

        const normal = collision.impactNormal ?? { x: 0, z: 1 }
        const impactSpeed = physics.handleCollisionBounce(normal.x, normal.z)

        // Heavy impacts: camera jolt + spark burst at the contact point
        if (impactSpeed > 0.15) {
          shakeRef.current = Math.min(1, 0.25 + impactSpeed * 0.55)
          if (onPlayerCrash) {
            onPlayerCrash([physics.carPositionRef.current.x, 1, physics.carPositionRef.current.z])
          }
        }
      }
    } else {
      setIsColliding(false)
      physics.updatePosition(newX, newZ)
    }

    // Apply transformations to the car mesh (use physics refs)
    if (carRef.current) {
      carRef.current.position.x = physics.carPositionRef.current.x
      carRef.current.position.z = physics.carPositionRef.current.z
      // Rotation = steering only, so the car always points exactly where it
      // is moving (no curve offset — that made the car look rear-first)
      carRef.current.rotation.y = physics.carRotationRef.current
    }

    // Update camera to follow car (stable following with closer distance)
    const camera = state.camera
    const targetX = physics.carPositionRef.current.x
    const targetZ = physics.carPositionRef.current.z + 6  // Closer camera behind car
    const targetY = 4  // Lower camera height

    const previous = previousCameraTarget.current
    camera.position.x = followMovingTarget(camera.position.x, previous.x, targetX, delta)
    camera.position.y = followMovingTarget(camera.position.y, previous.y, targetY, delta)
    camera.position.z = followMovingTarget(camera.position.z, previous.z, targetZ, delta)
    previous.x = targetX; previous.y = targetY; previous.z = targetZ

    // Publish the current simulation position before environment frame callbacks.
    worldPositionRef.current.x = physics.carPositionRef.current.x
    worldPositionRef.current.z = physics.carPositionRef.current.z

    // Impact shake — decaying camera jolt on crashes (ref-driven, no state)
    if (shakeRef.current > 0.001) {
      const st = state.clock.elapsedTime
      camera.position.x += Math.sin(st * 71.3) * shakeRef.current * 0.4
      camera.position.y += Math.sin(st * 83.7 + 1.7) * shakeRef.current * 0.28
      shakeRef.current = Math.max(0, shakeRef.current - delta * 2.2)
    }

    // Make camera look at car
    camera.lookAt(physics.carPositionRef.current.x, 0, physics.carPositionRef.current.z)

    // Camera banking — roll into the steering, weighted by speed
    const speedAbs = Math.abs(physics.speedRef.current)
    const rollTarget = physics.steerAngleRef.current * Math.min(1, speedAbs) * 0.085
    rollRef.current += (rollTarget - rollRef.current) * Math.min(1, delta * 6)
    camera.rotateZ(rollRef.current)

    // Speed-based FOV kick — widens under boost, glides back when cruising.
    // Projection matrix only touched while the FOV is actually changing.
    const persp = camera as PerspectiveCamera
    const speedRatio = Math.min(1, Math.abs(physics.speedRef.current) / 1.8)
    const boostKick = Math.max(0, speedRatio - 0.45) / 0.55
    const targetFov = 75 + boostKick * 13
    const fovDelta = targetFov - persp.fov
    if (Math.abs(fovDelta) > 0.02) {
      persp.fov += fovDelta * Math.min(1, delta * 5)
      persp.updateProjectionMatrix()
    }

    // Report position to parent component – with smoother throttling
    if (onPositionChange) {
      const last = lastSentPositionRef.current
      const current = physics.carPositionRef.current
      const dx = Math.abs(current.x - last.x)
      const dz = Math.abs(current.z - last.z)
      // Use larger thresholds to reduce frequency and prevent stutters
      if (dx > 1.0 || dz > 2.0) {
        onPositionChange(current)
        lastSentPositionRef.current = { ...current }
      }
    }

    // Update HUD displays
    hud.updateHUD(
      physics.speedRef.current,
      score,
      powerups.getPowerupState(currentTime),
      weapons.getWeaponState(currentTime)
    )

    // Report total distance to parent component
    // if (onDistanceChange) {
    //   onDistanceChange(totalDistance)
    // }
  }, -1) // Physics/camera precede environment updates and rendering.

  return (
    <>
      <CarVisual
        ref={carRef}
        position={position}
        isColliding={isColliding}
        spreadShotActive={weapons.spreadShotActive}
        isBoosted={powerups.isBoosted}
        tripleRocketActive={weapons.tripleRocketActive}
        speedRef={physics.speedRef}
        weaponFeedback={weapons.visualFeedback}
      />
      {/* Boost speed streaks — reads physics refs directly, zero re-renders */}
      <SpeedLines speedRef={physics.speedRef} carPositionRef={physics.carPositionRef} />
    </>
  )
}

export default memo(Car)