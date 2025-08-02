import { useRef, useState, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { ObstacleData, checkCollisions, getObstaclesInRange } from '../utils/collision'

interface CarProps {
  position?: [number, number, number]
  onSpeedChange?: (speed: number) => void
  onPositionChange?: (position: { x: number, z: number }) => void
  onDistanceChange?: (distance: number) => void
  obstacles?: ObstacleData[]
  onObstacleCollected?: (obstacleId: string) => void
  onHUDUpdate?: (hudData: { speed: number, isBoosted: boolean, boostTimeRemaining: number, score: number, spreadShotActive: boolean, spreadShotTimeRemaining: number }) => void
  onRewardCollected?: (points: number, position: [number, number, number]) => void
  onShoot?: (startPosition: [number, number, number], angle: number) => void
  onSpreadShoot?: (shots: Array<{ position: [number, number, number], angle: number }>) => void
  score?: number
  onScoreUpdate?: (newScore: number) => void
}

function Car({ position = [0, 0, 0], onSpeedChange, onPositionChange, obstacles = [], onObstacleCollected, onHUDUpdate, onRewardCollected, onShoot, onSpreadShoot, score = 0, onScoreUpdate }: CarProps) {
  const carRef = useRef<Group>(null)
  const [carPosition, setCarPosition] = useState({ x: 0, z: 0 })
  const [carRotation, setCarRotation] = useState(0)
  const [speed, setSpeed] = useState(0)
  const [steerAngle, setSteerAngle] = useState(0)
  const [isColliding, setIsColliding] = useState(false)
  const [isBoosted, setIsBoosted] = useState(false)
  const [boostEndTime, setBoostEndTime] = useState(0)
  // Track last position sent to parent to avoid spamming state updates
  const lastSentPositionRef = useRef(carPosition)
  const [boostTransitionSpeed, setBoostTransitionSpeed] = useState(1.0) // Multiplier for smooth transition
  const [lastShotTime, setLastShotTime] = useState(0)
  const [lastSpreadShotTime, setLastSpreadShotTime] = useState(0)
  const [spreadShotActive, setSpreadShotActive] = useState(false)
  const [spreadShotEndTime, setSpreadShotEndTime] = useState(0)
  const [lastSpreadShotScore, setLastSpreadShotScore] = useState(0)
  const keysRef = useRef({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false
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
            shotAngles.push(carRotation + angleOffset)
          }
          
          const shots = shotAngles.map(angle => {
            const shootOffsetDistance = 3
            const shootX = carPosition.x - Math.sin(angle) * shootOffsetDistance
            const shootZ = carPosition.z - Math.cos(angle) * shootOffsetDistance
            return {
              position: [shootX, 1, shootZ] as [number, number, number],
              angle
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
          const shootX = carPosition.x - Math.sin(carRotation) * shootOffsetDistance
          const shootZ = carPosition.z - Math.cos(carRotation) * shootOffsetDistance
          const shootPosition: [number, number, number] = [shootX, 1, shootZ]
          onShoot(shootPosition, carRotation)
          setLastShotTime(currentTime)
        }
      }
    }
    if (isBoosted && currentTime > boostEndTime) {
      setIsBoosted(false)
    }
    
    // Smooth boost transition - gradually reduce speed multiplier when boost ends
    setBoostTransitionSpeed(prev => {
      if (isBoosted) {
        // When boosted, quickly ramp up to 1.25x speed (+25% boost)
        return Math.min(1.25, prev + (5.0 * delta)) // Fast ramp up
      } else {
        // When not boosted, gradually return to 1.0x speed
        return Math.max(1.0, prev - (2.0 * delta)) // Slower ramp down for smooth transition
      }
    })

    // Car physics constants (modified by smooth boost transition)
    const baseMaxSpeed = 0.9 // Increased from 0.6 to make old boost speed the new default
    const maxSpeed = baseMaxSpeed * boostTransitionSpeed // Smoothly transition between normal and boost speed
    const acceleration = 1.8 * boostTransitionSpeed // Increased proportionally
    const deceleration = 0.8
    const brakeDeceleration = 2.0
    const maxSteerAngle = 0.8
    const steerSpeed = 3.0

    // Update speed based on input
    setSpeed(prev => {
      let newSpeed = prev
      
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
      
      return Math.max(-maxSpeed * 0.5, Math.min(maxSpeed, newSpeed))
    })

    // Update steering angle based on input
    setSteerAngle(prev => {
      let newSteerAngle = prev
      
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
      
      return Math.max(-maxSteerAngle, Math.min(maxSteerAngle, newSteerAngle))
    })

    // Update car rotation and position based on physics
    setCarRotation(prev => {
      // Make steering more responsive at low speeds, normal at high speeds
      const absSpeed = Math.abs(speed)
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
      
      const turnRate = steerAngle * speedFactor * 2.0
      return prev + turnRate * delta
    })

    // Update total distance traveled (this drives the grid animation)
    // setTotalDistance(prev => {
    //   const distanceThisFrame = Math.abs(speed) * delta * 10  // Scale down the distance
    //   return prev + distanceThisFrame
    // })

    setCarPosition(prev => {
      // Calculate new position
      const newX = prev.x - Math.sin(carRotation) * speed * delta * 60  // Fixed: - for correct left/right movement
      const newZ = prev.z - Math.cos(carRotation) * speed * delta * 60  // Fixed: - instead of +
      
      // Check for collisions at new position
      const nearbyObstacles = getObstaclesInRange(obstacles, newX, newZ, 10)
      const collision = checkCollisions(newX, newZ, nearbyObstacles)
      
      if (collision.hit) {
        if (collision.isBoost) {
          // Speed boost collected!
          setIsBoosted(true)
          setBoostEndTime(currentTime + 5000) // 5 seconds boost
          setIsColliding(false)
          
          // Remove the collected boost obstacle
          if (onObstacleCollected && collision.obstacle) {
            onObstacleCollected(collision.obstacle.id)
          }
          
          // Continue movement - don't stop for boost items
          return {
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
          return {
            x: Math.max(-18, Math.min(18, newX)),
            z: newZ
          }
        } else {
          // Regular collision - stop movement and reduce speed
          setIsColliding(true)
          setSpeed(prev => Math.max(0, prev * 0.1)) // Dramatic speed reduction
          
          // Don't update position - stay where we are
          return prev
        }
      } else {
        setIsColliding(false)
        return {
          x: Math.max(-18, Math.min(18, newX)), // Match full grid width (-20 to +20 with car width margin)
          z: newZ
        }
      }
    })

    // Apply transformations to the car mesh
    carRef.current.position.x = carPosition.x
    carRef.current.position.z = carPosition.z
    carRef.current.rotation.y = carRotation

    // Update camera to follow car
    const camera = state.camera
    const targetX = carPosition.x
    const targetZ = carPosition.z + 10  // Camera behind car
    const targetY = 5  // Camera height

    // Smooth camera following
    camera.position.x += (targetX - camera.position.x) * 0.1
    camera.position.z += (targetZ - camera.position.z) * 0.1
    camera.position.y += (targetY - camera.position.y) * 0.1
    
    // Make camera look at car
    camera.lookAt(carPosition.x, 0, carPosition.z)

    // Report speed to parent component
    if (onSpeedChange) {
      onSpeedChange(speed)
    }

    // Report position to parent component – throttled to reduce parent re-renders
    if (onPositionChange) {
      const last = lastSentPositionRef.current
      const dx = Math.abs(carPosition.x - last.x)
      const dz = Math.abs(carPosition.z - last.z)
      // Notify only when moved significantly (tweak thresholds as needed)
      if (dx > 0.25 || dz > 0.5) {
        onPositionChange(carPosition)
        lastSentPositionRef.current = { ...carPosition }
      }
    }

    // Report HUD data to parent component
    if (onHUDUpdate) {
      const boostTimeRemaining = isBoosted ? Math.max(0, boostEndTime - currentTime) : 0
      const spreadShotTimeRemaining = spreadShotActive ? Math.max(0, spreadShotEndTime - currentTime) : 0
      onHUDUpdate({ speed, isBoosted, boostTimeRemaining, score, spreadShotActive, spreadShotTimeRemaining })
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

  return (
    <group ref={carRef} position={position}>
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[2, 0.8, 4]} />
        <meshStandardMaterial color={getCarColor()} />
      </mesh>
      
      <mesh position={[0, 0.2, 0]}>
        <boxGeometry args={[1.8, 0.4, 3.5]} />
        <meshStandardMaterial color={getAccentColor()} />
      </mesh>
      
      <mesh position={[-0.7, 0, 1.3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.7, 0, 1.3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[-0.7, 0, -1.3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.7, 0, -1.3]}>
        <cylinderGeometry args={[0.3, 0.3, 0.2]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      
      <mesh position={[0, 0.9, 0.5]}>
        <boxGeometry args={[1.5, 0.6, 1.5]} />
        <meshStandardMaterial color="#00ffff" transparent opacity={0.7} />
      </mesh>
    </group>
  )
}

export default memo(Car)