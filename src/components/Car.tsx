import { useRef, useState, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { ObstacleData, checkCollisions, getObstaclesInRange } from '../utils/collision'
import { useCarWeapons } from '../hooks/useCarWeapons'
import { useCarPhysics } from '../hooks/useCarPhysics'
import { useCarPowerups } from '../hooks/useCarPowerups'
import { useCarHUD } from '../hooks/useCarHUD'
import CarVisual from './CarVisual'
import { toggleSound } from '../utils/audio'

interface CarProps {
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
}

function Car({ position = [0, 0, 0], onPositionChange, obstacles = [], onObstacleCollected, onRewardCollected, onShoot, onSpreadShoot, onMissileShoot, score = 0, onScoreUpdate, onEnemyCarBounce }: CarProps) {
  const carRef = useRef<Group>(null)
  
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
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignore auto-repeat to prevent retriggering actions like audio start
      if (event.repeat) return
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = true
          break
        case 'ArrowUp':
        case 'KeyW':
          keysRef.current.up = true
          break
        case 'ArrowDown':
        case 'KeyS':
          keysRef.current.down = true
          break
        case 'Space':
          keysRef.current.shoot = true
          break
        case 'KeyR':
          toggleSound()
          break
        case 'KeyM':
          keysRef.current.missile = true
          break
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          keysRef.current.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          keysRef.current.right = false
          break
        case 'ArrowUp':
        case 'KeyW':
          keysRef.current.up = false
          break
        case 'ArrowDown':
        case 'KeyS':
          keysRef.current.down = false
          break
        case 'Space':
          keysRef.current.shoot = false
          break
        case 'KeyM':
          keysRef.current.missile = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
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
    const { newX, newZ, sinAngle, cosAngle } = physics.updatePhysics({
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
        // Regular collision - bounce only if speed is significant
        setIsColliding(true)
        
        // Handle enemy car bounce if collision data includes it
        if (collision.enemyCarBounce && onEnemyCarBounce && collision.obstacle) {
          onEnemyCarBounce(
            collision.obstacle.id, 
            collision.enemyCarBounce.newVelocity, 
            collision.enemyCarBounce.bounceDistance
          )
        }
        
        physics.handleCollisionBounce(sinAngle, cosAngle)
      }
    } else {
      setIsColliding(false)
      physics.updatePosition(newX, newZ)
    }

    // Apply transformations to the car mesh (use physics refs)
    if (carRef.current) {
      carRef.current.position.x = physics.carPositionRef.current.x
      carRef.current.position.z = physics.carPositionRef.current.z
      carRef.current.rotation.y = physics.carRotationRef.current
    }

    // Update camera to follow car (stable following with closer distance)
    const camera = state.camera
    const targetX = physics.carPositionRef.current.x
    const targetZ = physics.carPositionRef.current.z + 6  // Closer camera behind car
    const targetY = 4  // Lower camera height

    // Gentler camera following - slower interpolation for stability
    const cameraLerpFactor = 0.1  // Much slower than delta * 3
    camera.position.x += (targetX - camera.position.x) * cameraLerpFactor
    camera.position.z += (targetZ - camera.position.z) * cameraLerpFactor
    camera.position.y += (targetY - camera.position.y) * cameraLerpFactor
    
    // Make camera look at car
    camera.lookAt(physics.carPositionRef.current.x, 0, physics.carPositionRef.current.z)

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
  })

  return (
    <CarVisual 
      ref={carRef}
      position={position}
      isColliding={isColliding}
      spreadShotActive={weapons.spreadShotActive}
      isBoosted={powerups.isBoosted}
      tripleRocketActive={weapons.tripleRocketActive}
    />
  )
}

export default memo(Car)