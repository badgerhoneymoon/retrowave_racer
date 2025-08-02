import { useRef } from 'react'

interface UseCarPhysicsProps {
  boostTransitionSpeed: number
  delta: number
  keys: {
    left: boolean
    right: boolean
    up: boolean
    down: boolean
  }
}

export interface CarPhysicsState {
  position: { x: number, z: number }
  rotation: number
  speed: number
  steerAngle: number
}

export function useCarPhysics() {
  // Physics state refs (for performance - no React re-renders)
  const carPositionRef = useRef({ x: 0, z: 0 })
  const carRotationRef = useRef(0)
  const speedRef = useRef(0)
  const steerAngleRef = useRef(0)

  const updatePhysics = ({ boostTransitionSpeed, delta, keys }: UseCarPhysicsProps) => {
    // Car physics constants (modified by smooth boost transition)
    const baseMaxSpeed = 0.9 // Increased from 0.6 to make old boost speed the new default
    const maxSpeed = baseMaxSpeed * boostTransitionSpeed // Smoothly transition between normal and boost speed
    const acceleration = 1.8 * boostTransitionSpeed // Increased proportionally
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

    // Update car rotation based on physics (direct ref modification - no React re-render)
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

    // Calculate potential new position using trigonometry
    const sinAngle = Math.sin(carRotationRef.current)
    const cosAngle = Math.cos(carRotationRef.current)
    const newX = carPositionRef.current.x - sinAngle * speedRef.current * delta * 60  // Fixed: - for correct left/right movement
    const newZ = carPositionRef.current.z - cosAngle * speedRef.current * delta * 60  // Fixed: - instead of +

    return { newX, newZ, sinAngle, cosAngle }
  }

  // Apply position update (called after collision detection)
  const updatePosition = (x: number, z: number) => {
    carPositionRef.current = {
      x: Math.max(-18, Math.min(18, x)), // Match full grid width (-20 to +20 with car width margin)
      z
    }
  }

  // Handle collision bounce physics
  const handleCollisionBounce = (sinAngle: number, cosAngle: number) => {
    const currentSpeed = Math.abs(speedRef.current)
    const speedThreshold = 0.05 // No bounce below this speed
    
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

  // Get current physics state for external use
  const getPhysicsState = (): CarPhysicsState => ({
    position: carPositionRef.current,
    rotation: carRotationRef.current,
    speed: speedRef.current,
    steerAngle: steerAngleRef.current
  })

  return {
    // State refs (for direct access when needed)
    carPositionRef,
    carRotationRef,
    speedRef,
    steerAngleRef,
    
    // Actions
    updatePhysics,
    updatePosition,
    handleCollisionBounce,
    getPhysicsState
  }
}