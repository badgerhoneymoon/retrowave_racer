import { useRef } from 'react'
import { roadCenterAt } from '../utils/roadCurve'

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
  // Velocity direction — lags the heading under grip loss (this is the drift)
  const velHeadingRef = useRef(0)

  const updatePhysics = ({ boostTransitionSpeed, delta, keys }: UseCarPhysicsProps) => {
    // Car physics constants (modified by smooth boost transition)
    const baseMaxSpeed = 0.9 // Increased from 0.6 to make old boost speed the new default
    const maxSpeed = baseMaxSpeed * boostTransitionSpeed // Smoothly transition between normal and boost speed
    const acceleration = 1.8 * boostTransitionSpeed // Increased proportionally
    const deceleration = 0.8
    const brakeDeceleration = 2.0

    // --- Steering mechanics: bicycle-ish model + grip/drift ---
    const maxSteerAngle = 0.8        // wheel angle limit (rad)
    const steerRate = 3.5            // how fast the wheel turns (rad/s)
    const wheelbase = 34             // yawRate = v * tan(wheel) / wheelbase
    const highSpeedStability = 0.006 // yaw effectiveness falloff with speed
    const gripBase = 8               // velocity realigns with heading at this rate...
    const gripSpeedLoss = 0.06       // ...reduced by speed → the drift

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

    // Steering wheel: rate-limited toward the input target, self-centering
    // (frame-rate independent, replaces the old per-frame 0.8 decay)
    const steerTarget = keys.left ? maxSteerAngle : keys.right ? -maxSteerAngle : 0
    const steerDelta = steerTarget - steerAngleRef.current
    const maxSteerStep = steerRate * delta
    steerAngleRef.current += Math.max(-maxSteerStep, Math.min(maxSteerStep, steerDelta))

    // Yaw from the bicycle model — less effective at speed, nimble when slow
    const v = speedRef.current * 60 // world units/sec
    const absV = Math.abs(v)
    const stability = 1 / (1 + absV * highSpeedStability)
    const lowSpeedAgility = 1 + Math.max(0, (12 - absV) / 12) * 0.6
    const yawRate = (v * Math.tan(steerAngleRef.current)) / wheelbase * stability * lowSpeedAgility
    carRotationRef.current += yawRate * delta

    // Grip/drift: the velocity direction lags the heading at speed.
    // No steering input → velocity realigns → still dead straight with ↑.
    const grip = gripBase / (1 + absV * gripSpeedLoss)
    let headingDelta = carRotationRef.current - velHeadingRef.current
    headingDelta = Math.atan2(Math.sin(headingDelta), Math.cos(headingDelta))
    velHeadingRef.current += headingDelta * Math.min(1, grip * delta)

    // Advance along the VELOCITY direction — the drift slide. The body keeps
    // pointing at carRotation, so it visibly angles into the slide.
    const sinMove = Math.sin(velHeadingRef.current)
    const cosMove = Math.cos(velHeadingRef.current)
    const newX = carPositionRef.current.x - sinMove * v * delta
    const newZ = carPositionRef.current.z - cosMove * v * delta

    return { newX, newZ, sinAngle: sinMove, cosAngle: cosMove }
  }

  // Apply position update (called after collision detection)
  const updatePosition = (x: number, z: number) => {
    const center = roadCenterAt(z)
    carPositionRef.current = {
      x: Math.max(center - 18, Math.min(center + 18, x)), // Clamp to the curving road edges
      z
    }
  }

  // Handle collision bounce physics along the contact normal.
  // Returns the impact speed (0 if negligible) so callers can scale shake/FX.
  const handleCollisionBounce = (normalX: number, normalZ: number): number => {
    const currentSpeed = Math.abs(speedRef.current)
    const speedThreshold = 0.05 // No bounce below this speed

    if (currentSpeed < speedThreshold) {
      // Very slow collision - just stop, no bounce
      speedRef.current = 0
      return 0
    }

    const impactSpeed = currentSpeed

    // Push the car out along the contact normal (away from the obstacle)
    const bounceDistance = currentSpeed * 4.5
    const bounceX = carPositionRef.current.x + normalX * bounceDistance
    const bounceZ = carPositionRef.current.z + normalZ * bounceDistance

    const center = roadCenterAt(bounceZ)
    carPositionRef.current = {
      x: Math.max(center - 18, Math.min(center + 18, bounceX)),
      z: bounceZ
    }

    // Response depends on impact geometry:
    // - head-on (normal mostly along Z): thrown backwards, heavy speed loss
    // - glancing (normal mostly along X): scrub speed, keep driving
    const headOn = Math.abs(normalZ) > Math.abs(normalX)
    if (headOn) {
      speedRef.current = -currentSpeed * 0.45
    } else {
      speedRef.current = currentSpeed * 0.55
    }

    // Steering kick away from the impact for a visible knock
    steerAngleRef.current += (normalX > 0 ? -1 : 1) * 0.22
    // Knock the slide direction too, so impacts shove the car's momentum
    velHeadingRef.current += (normalX > 0 ? -1 : 1) * 0.12

    return impactSpeed
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