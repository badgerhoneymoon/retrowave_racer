import { useRef, useState, useEffect, memo, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { ObstacleData, checkCollisions, getObstaclesInRange } from '../utils/collision'
import { geometryCache } from '../utils/geometryCache'

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
  // Convert to refs to avoid React re-renders every frame
  const carPositionRef = useRef({ x: 0, z: 0 })
  const carRotationRef = useRef(0)
  const speedRef = useRef(0)
  const steerAngleRef = useRef(0)
  const [isColliding, setIsColliding] = useState(false)
  const [isBoosted, setIsBoosted] = useState(false)
  const [boostEndTime, setBoostEndTime] = useState(0)
  // Track last position sent to parent to avoid spamming state updates
  const lastSentPositionRef = useRef({ x: 0, z: 0 })
  const boostTransitionSpeedRef = useRef(1.0) // Multiplier for smooth transition
  const [targetBoostSpeed, setTargetBoostSpeed] = useState(1.0) // Target boost multiplier
  const [lastShotTime, setLastShotTime] = useState(0)
  const [lastSpreadShotTime, setLastSpreadShotTime] = useState(0)
  const [spreadShotActive, setSpreadShotActive] = useState(false)
  const [spreadShotEndTime, setSpreadShotEndTime] = useState(0)
  const [lastSpreadShotScore, setLastSpreadShotScore] = useState(0)
  const [lastMissileTime, setLastMissileTime] = useState(0)
  const [missilesRemaining, setMissilesRemaining] = useState(5)
  const frameCountRef = useRef(0) // Proper frame counter
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

    // Check if boost expired and handle smooth transition
    const currentTime = state.clock.elapsedTime * 1000
    
    // Check if spread shot should activate based on score (every 1000 points)
    if (score >= lastSpreadShotScore + 1000 && !spreadShotActive) {
      setSpreadShotActive(true)
      setSpreadShotEndTime(currentTime + 5000) // 5 seconds duration
      setLastSpreadShotScore(Math.floor(score / 1000) * 1000) // Set to the last 1000 threshold reached
    }
    
    // Check if spread shot expired
    if (spreadShotActive && currentTime > spreadShotEndTime) {
      setSpreadShotActive(false)
    }
    
    
    // Handle shooting
    if (keys.shoot && onShoot) {
      if (spreadShotActive && onSpreadShoot) {
        // Spread shot mode: much longer cooldown between bursts
        const spreadShotCooldown = 800 // 800ms between spread shot bursts
        if (currentTime - lastSpreadShotTime > spreadShotCooldown) {
          // Fire 8 projectiles in different angles
          const spreadAngle = Math.PI / 6 // 30 degrees spread
          const shotAngles = []
          for (let i = 0; i < 8; i++) {
            const angleOffset = (i - 3.5) * (spreadAngle / 7) // Spread evenly around center
            shotAngles.push(carRotationRef.current + angleOffset)
          }
          
          const shots = shotAngles.map(angle => {
            const shootOffsetDistance = 3
            const shootSin = Math.sin(angle)
            const shootCos = Math.cos(angle)
            const shootX = carPositionRef.current.x - shootSin * shootOffsetDistance
            const shootZ = carPositionRef.current.z - shootCos * shootOffsetDistance
            return {
              position: [shootX, 1, shootZ] as [number, number, number],
              angle,
              carVelocity: speedRef.current
            }
          })
          
          onSpreadShoot(shots)
          setLastSpreadShotTime(currentTime)
        }
      } else {
        // Normal single shot mode
        const normalShotCooldown = 300 // 300ms between normal shots
        if (currentTime - lastShotTime > normalShotCooldown) {
          const shootOffsetDistance = 3
          const shootX = carPositionRef.current.x - Math.sin(carRotationRef.current) * shootOffsetDistance
          const shootZ = carPositionRef.current.z - Math.cos(carRotationRef.current) * shootOffsetDistance
          const shootPosition: [number, number, number] = [shootX, 1, shootZ]
          onShoot(shootPosition, carRotationRef.current, speedRef.current)
          setLastShotTime(currentTime)
        }
      }
    }
    
    // Handle missile shooting
    if (keys.missile && onMissileShoot && missilesRemaining > 0) {
      const missileCooldown = 800 // Increased to 0.8 seconds to reduce React re-render frequency
      if (currentTime - lastMissileTime > missileCooldown) {
        const shootOffsetDistance = 3
        const shootX = carPositionRef.current.x - Math.sin(carRotationRef.current) * shootOffsetDistance
        const shootZ = carPositionRef.current.z - Math.cos(carRotationRef.current) * shootOffsetDistance
        const shootPosition: [number, number, number] = [shootX, 2, shootZ] // Higher Y for missiles
        onMissileShoot(shootPosition, carRotationRef.current, speedRef.current)
        setLastMissileTime(currentTime)
        setMissilesRemaining(prev => Math.max(0, prev - 1)) // Prevent negative values
      }
    }
    if (isBoosted && currentTime > boostEndTime) {
      setIsBoosted(false)
      setTargetBoostSpeed(1.0) // Reset target speed when boost expires
    }
    
    // Smooth boost transition - gradually transition to target speed
    if (isBoosted) {
      // When boosted, quickly ramp up to target boost speed
      boostTransitionSpeedRef.current = Math.min(targetBoostSpeed, boostTransitionSpeedRef.current + (5.0 * delta)) // Fast ramp up
    } else {
      // When not boosted, gradually return to 1.0x speed
      boostTransitionSpeedRef.current = Math.max(1.0, boostTransitionSpeedRef.current - (2.0 * delta)) // Slower ramp down for smooth transition
    }

    // Car physics constants (modified by smooth boost transition)
    const baseMaxSpeed = 0.9 // Increased from 0.6 to make old boost speed the new default
    const maxSpeed = baseMaxSpeed * boostTransitionSpeedRef.current // Smoothly transition between normal and boost speed
    const acceleration = 1.8 * boostTransitionSpeedRef.current // Increased proportionally
    const deceleration = 0.8
    const brakeDeceleration = 2.0
    const maxSteerAngle = 0.8
    const steerSpeed = 3.0

    // Update speed based on input (direct ref modification - no React re-render)
    let newSpeed = speedRef.current
    
    if (keys.up) {
      newSpeed += acceleration * delta
    } else if (keys.down) {
      newSpeed -= brakeDeceleration * delta
    } else {
      // Natural deceleration
      if (newSpeed > 0) {
        newSpeed = Math.max(0, newSpeed - deceleration * delta)
      } else if (newSpeed < 0) {
        newSpeed = Math.min(0, newSpeed + deceleration * delta)
      }
    }
    
    speedRef.current = Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, newSpeed))

    // Update steering angle based on input (direct ref modification - no React re-render)
    let newSteerAngle = steerAngleRef.current
    
    if (keys.left) {
      newSteerAngle += steerSpeed * delta  // Left should be positive for correct mesh rotation
    } else if (keys.right) {
      newSteerAngle -= steerSpeed * delta  // Right should be negative for correct mesh rotation
    } else {
      // Return steering to center
      if (Math.abs(newSteerAngle) > 0.1) {
        newSteerAngle *= 0.8
      } else {
        newSteerAngle = 0
      }
    }
    
    steerAngleRef.current = Math.max(-maxSteerAngle, Math.min(maxSteerAngle, newSteerAngle))

    // Update car rotation and position based on physics (direct ref modification - no React re-render)
    // Make steering more responsive at low speeds, normal at high speeds
    const absSpeed = Math.abs(speedRef.current)
    let speedFactor
    
    if (absSpeed < 0.2) {
      // Very low speed (like after collision) - very maneuverable
      speedFactor = 0.8
    } else if (absSpeed < 0.4) {
      // Low speed - more maneuverable than high speed
      speedFactor = 0.6
    } else {
      // Normal/high speed - standard responsiveness
      speedFactor = Math.max(0.3, absSpeed)
    }
    
    const turnRate = steerAngleRef.current * speedFactor * 2.0
    carRotationRef.current += turnRate * delta

    // Cache trigonometric calculations after rotation update for performance
    const sinAngle = Math.sin(carRotationRef.current)
    const cosAngle = Math.cos(carRotationRef.current)

    // Calculate new position using cached trigonometric values (direct ref modification - no React re-render)
    const newX = carPositionRef.current.x - sinAngle * speedRef.current * delta * 60  // Fixed: - for correct left/right movement
    const newZ = carPositionRef.current.z - cosAngle * speedRef.current * delta * 60  // Fixed: - instead of +
      
    // Check for collisions at new position
    const nearbyObstacles = getObstaclesInRange(obstacles, newX, newZ, 10)
    const collision = checkCollisions(newX, newZ, nearbyObstacles, speedRef.current)
    
    if (collision.hit) {
      if (collision.isBoost) {
        // Speed boost collected!
        if (isBoosted) {
          // Already boosted - add cumulative 10% (0.1) to current boost
          setTargetBoostSpeed(prev => Math.min(2.0, prev + 0.1)) // Cap at 2.0x (100% boost)
        } else {
          // First boost - set to 1.35x (+35%)
          setIsBoosted(true)
          setTargetBoostSpeed(1.35)
        }
        setBoostEndTime(currentTime + 5000) // Reset to 5 seconds
        setIsColliding(false)
        
        // Remove the collected boost obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for boost items
        carPositionRef.current = {
          x: Math.max(-18, Math.min(18, newX)),
          z: newZ
        }
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
        carPositionRef.current = {
          x: Math.max(-18, Math.min(18, newX)),
          z: newZ
        }
      } else if (collision.isRocketLauncher) {
        // Rocket launcher collected!
        setMissilesRemaining(prev => prev + 5) // Add 5 missiles to current count (accumulate)
        setIsColliding(false)
        
        // Remove the collected rocket launcher obstacle
        if (onObstacleCollected && collision.obstacle) {
          onObstacleCollected(collision.obstacle.id)
        }
        
        // Continue movement - don't stop for rocket launcher
        carPositionRef.current = {
          x: Math.max(-18, Math.min(18, newX)),
          z: newZ
        }
      } else {
        // Regular collision - bounce only if speed is significant
        setIsColliding(true)
        
        const currentSpeed = Math.abs(speedRef.current)
        const speedThreshold = 0.05 // No bounce below this speed
        
        // Handle enemy car bounce if collision data includes it
        if (collision.enemyCarBounce && onEnemyCarBounce && collision.obstacle) {
          onEnemyCarBounce(
            collision.obstacle.id, 
            collision.enemyCarBounce.newVelocity, 
            collision.enemyCarBounce.bounceDistance
          )
        }
        
        if (currentSpeed < speedThreshold) {
          // Very slow collision - just stop, no bounce
          speedRef.current = 0
          // Position stays the same - no bounce movement
        } else {
          // Significant speed - bounce back proportional to speed (more dramatic at high speeds)
          const bounceDistance = currentSpeed * 4.5 // Increased from 3.0 for more bounce
          const bounceX = carPositionRef.current.x + sinAngle * bounceDistance
          const bounceZ = carPositionRef.current.z + cosAngle * bounceDistance
          
          // Apply bounce position (clamped to road bounds)
          carPositionRef.current = {
            x: Math.max(-18, Math.min(18, bounceX)),
            z: bounceZ
          }
          
          // Reverse speed more dramatically at high speeds
          speedRef.current = -currentSpeed * 0.5 // Increased from 0.3 for stronger bounce
        }
      }
    } else {
      setIsColliding(false)
      carPositionRef.current = {
        x: Math.max(-18, Math.min(18, newX)), // Match full grid width (-20 to +20 with car width margin)
        z: newZ
      }
    }

    // Apply transformations to the car mesh (use refs directly)
    if (carRef.current) {
      carRef.current.position.x = carPositionRef.current.x
      carRef.current.position.z = carPositionRef.current.z
      carRef.current.rotation.y = carRotationRef.current
    }

    // Update camera to follow car (stable following with closer distance)
    const camera = state.camera
    const targetX = carPositionRef.current.x
    const targetZ = carPositionRef.current.z + 6  // Closer camera behind car
    const targetY = 4  // Lower camera height

    // Gentler camera following - slower interpolation for stability
    const cameraLerpFactor = 0.1  // Much slower than delta * 3
    camera.position.x += (targetX - camera.position.x) * cameraLerpFactor
    camera.position.z += (targetZ - camera.position.z) * cameraLerpFactor
    camera.position.y += (targetY - camera.position.y) * cameraLerpFactor
    
    // Make camera look at car
    camera.lookAt(carPositionRef.current.x, 0, carPositionRef.current.z)

    // Report position to parent component – with smoother throttling
    if (onPositionChange) {
      const last = lastSentPositionRef.current
      const current = carPositionRef.current
      const dx = Math.abs(current.x - last.x)
      const dz = Math.abs(current.z - last.z)
      // Use larger thresholds to reduce frequency and prevent stutters
      if (dx > 1.0 || dz > 2.0) {
        onPositionChange(current)
        lastSentPositionRef.current = { ...current }
      }
    }

    // Direct DOM updates for better performance (bypass React state)
    frameCountRef.current += 1 
    if (frameCountRef.current % 6 === 0) {
      const boostTimeRemaining = isBoosted ? Math.max(0, boostEndTime - currentTime) : 0
      const spreadShotTimeRemaining = spreadShotActive ? Math.max(0, spreadShotEndTime - currentTime) : 0
      
      // Update speed display directly
      const speedPercent = Math.round((Math.abs(speedRef.current) / 1.8) * 100)
      const speedElement = document.querySelector('[data-hud="speed-value"]') as HTMLElement
      const speedBarElement = document.querySelector('[data-hud="speed-bar"]') as HTMLElement
      if (speedElement) {
        speedElement.textContent = `${speedPercent}%`
        speedElement.style.color = isBoosted ? '#00ff00' : '#00ffff'
      }
      if (speedBarElement) {
        speedBarElement.style.width = `${Math.min(100, speedPercent)}%`
        speedBarElement.style.backgroundColor = isBoosted ? '#00ff00' : '#00ffff'
        speedBarElement.style.boxShadow = isBoosted ? '0 0 10px #00ff00' : '0 0 10px #00ffff'
      }
      
      // Update score display directly
      const scoreElement = document.querySelector('[data-hud="score-value"]') as HTMLElement
      if (scoreElement) {
        scoreElement.textContent = score.toLocaleString()
      }
      
      // Update missiles display directly
      const missilesElement = document.querySelector('[data-hud="missiles-value"]') as HTMLElement
      if (missilesElement) {
        missilesElement.textContent = `🚀 ${missilesRemaining}`
        missilesElement.style.color = missilesRemaining > 0 ? '#ff4400' : '#666666'
      }
      
      // Update boost display directly
      const boostContainer = document.querySelector('[data-hud="boost-container"]') as HTMLElement
      const boostValueElement = document.querySelector('[data-hud="boost-value"]') as HTMLElement
      const boostBarElement = document.querySelector('[data-hud="boost-bar"]') as HTMLElement
      if (boostContainer) {
        boostContainer.style.display = isBoosted ? 'block' : 'none'
      }
      if (boostValueElement && isBoosted) {
        const boostSeconds = Math.max(0, Math.ceil(boostTimeRemaining / 1000))
        boostValueElement.textContent = `${boostSeconds}s`
      }
      if (boostBarElement && isBoosted) {
        boostBarElement.style.width = `${(boostTimeRemaining / 5000) * 100}%`
      }
      
      // Update spread shot display directly
      const spreadContainer = document.querySelector('[data-hud="spread-container"]') as HTMLElement
      const spreadValueElement = document.querySelector('[data-hud="spread-value"]') as HTMLElement
      const spreadBarElement = document.querySelector('[data-hud="spread-bar"]') as HTMLElement
      if (spreadContainer) {
        spreadContainer.style.display = spreadShotActive ? 'block' : 'none'
      }
      if (spreadValueElement && spreadShotActive) {
        const spreadSeconds = Math.max(0, Math.ceil(spreadShotTimeRemaining / 1000))
        spreadValueElement.textContent = `${spreadSeconds}s`
      }
      if (spreadBarElement && spreadShotActive) {
        spreadBarElement.style.width = `${(spreadShotTimeRemaining / 5000) * 100}%`
      }
    }

    // Report total distance to parent component
    // if (onDistanceChange) {
    //   onDistanceChange(totalDistance)
    // }
  })

  // Visual colors based on state
  const getCarColor = () => {
    if (isColliding) return "#ffffff" // White flash on collision
    if (spreadShotActive) return "#ffff00" // Yellow when spread shot active
    if (isBoosted) return "#00ff00"   // Green when boosted
    return "#ff0080"                  // Normal pink
  }
  
  const getAccentColor = () => {
    if (isColliding) return "#ffffff" // White flash on collision
    if (spreadShotActive) return "#ffff80" // Light yellow when spread shot active
    if (isBoosted) return "#80ff80"   // Light green when boosted
    return "#ff6600"                  // Normal orange
  }

  // Memoized materials to prevent recreation on every render
  const carBodyMaterial = useMemo(() => {
    return <meshStandardMaterial color={getCarColor()} />
  }, [isColliding, spreadShotActive, isBoosted])

  const carAccentMaterial = useMemo(() => {
    return <meshStandardMaterial color={getAccentColor()} />
  }, [isColliding, spreadShotActive, isBoosted])

  const wheelMaterial = useMemo(() => {
    return <meshStandardMaterial color="#222" />
  }, [])

  const windshieldMaterial = useMemo(() => {
    return <meshStandardMaterial color="#00ffff" transparent opacity={0.7} />
  }, [])

  return (
    <group ref={carRef} position={position}>
      <mesh position={[0, 0.5, 0]} geometry={geometryCache.getGeometry('car-body')}>
        {carBodyMaterial}
      </mesh>
      
      <mesh position={[0, 0.2, 0]} geometry={geometryCache.getGeometry('car-accent')}>
        {carAccentMaterial}
      </mesh>
      
      <mesh position={[-0.7, 0, 1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[0.7, 0, 1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[-0.7, 0, -1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[0.7, 0, -1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      
      <mesh position={[0, 0.9, 0.5]} geometry={geometryCache.getGeometry('car-windshield')}>
        {windshieldMaterial}
      </mesh>
    </group>
  )
}

export default memo(Car)