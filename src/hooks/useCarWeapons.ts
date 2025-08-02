import { useState } from 'react'

interface UseCarWeaponsProps {
  score: number
  onShoot?: (startPosition: [number, number, number], angle: number, carVelocity: number) => void
  onSpreadShoot?: (shots: Array<{ position: [number, number, number], angle: number, carVelocity: number }>) => void
  onMissileShoot?: (startPosition: [number, number, number], angle: number, carVelocity: number) => void
}

export interface WeaponState {
  spreadShotActive: boolean
  spreadShotTimeRemaining: number
  missilesRemaining: number
}

export function useCarWeapons({ score, onShoot, onSpreadShoot, onMissileShoot }: UseCarWeaponsProps) {
  // Weapon timing state
  const [lastShotTime, setLastShotTime] = useState(0)
  const [lastMissileTime, setLastMissileTime] = useState(0)
  
  // Weapon power-up state
  const [spreadShotActive, setSpreadShotActive] = useState(false)
  const [spreadShotEndTime, setSpreadShotEndTime] = useState(0)
  const [lastSpreadShotScore, setLastSpreadShotScore] = useState(0)
  const [missilesRemaining, setMissilesRemaining] = useState(5)

  // Handle spread shot activation based on score
  const updateSpreadShot = (currentTime: number) => {
    // Activate spread shot every 1000 points
    if (score >= lastSpreadShotScore + 1000 && !spreadShotActive) {
      setSpreadShotActive(true)
      setSpreadShotEndTime(currentTime + 5000) // 5 seconds duration
      setLastSpreadShotScore(Math.floor(score / 1000) * 1000) // Set to the last 1000 threshold reached
    }

    // Deactivate spread shot when time expires
    if (spreadShotActive && currentTime > spreadShotEndTime) {
      setSpreadShotActive(false)
    }
  }

  // Handle shooting (space key)
  const handleShoot = (
    currentTime: number,
    carPosition: { x: number, z: number },
    carRotation: number,
    carVelocity: number
  ) => {
    const startPosition: [number, number, number] = [carPosition.x, 1, carPosition.z]
    
    if (spreadShotActive && onSpreadShoot) {
      // Spread shot mode: much longer cooldown between bursts (800ms)
      const spreadShotCooldown = 800
      if (currentTime - lastShotTime > spreadShotCooldown) {
        // Fire 8 projectiles in a fan pattern
        const spreadAngles = [-0.6, -0.4, -0.2, -0.1, 0.1, 0.2, 0.4, 0.6]
        const shots = spreadAngles.map(angleOffset => ({
          position: startPosition,
          angle: carRotation + angleOffset,
          carVelocity
        }))
        onSpreadShoot(shots)
        setLastShotTime(currentTime)
      }
    } else if (onShoot) {
      // Normal single shot mode: faster cooldown (300ms)
      const normalShotCooldown = 300
      if (currentTime - lastShotTime > normalShotCooldown) {
        onShoot(startPosition, carRotation, carVelocity)
        setLastShotTime(currentTime)
      }
    }
  }

  // Handle missile firing (M key)
  const handleMissileShoot = (
    currentTime: number,
    carPosition: { x: number, z: number },
    carRotation: number,
    carVelocity: number
  ) => {
    const missileCooldown = 800 // 0.8 seconds between missiles (original timing)
    
    if (missilesRemaining > 0 && currentTime - lastMissileTime > missileCooldown && onMissileShoot) {
      const startPosition: [number, number, number] = [carPosition.x, 2, carPosition.z]
      onMissileShoot(startPosition, carRotation, carVelocity)
      setMissilesRemaining(prev => prev - 1)
      setLastMissileTime(currentTime)
    }
  }

  // Add missiles when rocket launcher is collected
  const addMissiles = (count: number = 5) => {
    setMissilesRemaining(prev => prev + count)
  }

  // Get current weapon state for HUD
  const getWeaponState = (currentTime: number): WeaponState => ({
    spreadShotActive,
    spreadShotTimeRemaining: spreadShotActive ? Math.max(0, spreadShotEndTime - currentTime) : 0,
    missilesRemaining
  })

  return {
    // State
    spreadShotActive,
    missilesRemaining,
    
    // Actions
    updateSpreadShot,
    handleShoot,
    handleMissileShoot,
    addMissiles,
    getWeaponState
  }
}