import { useState, useRef } from 'react'

export interface PowerupState {
  isBoosted: boolean
  boostTimeRemaining: number
  boostMultiplier: number
}

export function useCarPowerups() {
  const [isBoosted, setIsBoosted] = useState(false)
  const [boostEndTime, setBoostEndTime] = useState(0)
  const [targetBoostSpeed, setTargetBoostSpeed] = useState(1.0)
  const boostTransitionSpeedRef = useRef(1.0)

  // Handle boost collection
  const collectBoost = (currentTime: number) => {
    if (isBoosted) {
      // Already boosted - add cumulative 10% (0.1) to current boost
      setTargetBoostSpeed(prev => Math.min(2.0, prev + 0.1)) // Cap at 2.0x (100% boost)
    } else {
      // First boost - set to 1.35x (+35%)
      setIsBoosted(true)
      setTargetBoostSpeed(1.35)
    }
    setBoostEndTime(currentTime + 5000) // Reset to 5 seconds
  }

  // Update boost state each frame
  const updateBoost = (currentTime: number, delta: number) => {
    // Check if boost expired
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

    return boostTransitionSpeedRef.current
  }

  // Get current powerup state for HUD/rendering
  const getPowerupState = (currentTime: number): PowerupState => ({
    isBoosted,
    boostTimeRemaining: isBoosted ? Math.max(0, boostEndTime - currentTime) : 0,
    boostMultiplier: boostTransitionSpeedRef.current
  })

  return {
    // State
    isBoosted,
    boostTransitionSpeedRef,
    
    // Actions
    collectBoost,
    updateBoost,
    getPowerupState
  }
}