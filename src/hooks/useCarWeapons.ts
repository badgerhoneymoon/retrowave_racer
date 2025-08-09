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
  tripleRocketActive: boolean
  tripleRocketTimeRemaining: number
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
  
  // Triple rocket mode state
  const [tripleRocketActive, setTripleRocketActive] = useState(false)
  const [tripleRocketEndTime, setTripleRocketEndTime] = useState(0)

  // Handle spread shot activation based on score
  const updateSpreadShot = (currentTime: number) => {
    // Activate spread shot every 500 points
    if (score >= lastSpreadShotScore + 500 && !spreadShotActive) {
      setSpreadShotActive(true)
      setSpreadShotEndTime(currentTime + 5000) // 5 seconds duration
      setLastSpreadShotScore(Math.floor(score / 500) * 500) // Set to the last 500 threshold reached
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
      // Spread shot mode: reduced cooldown between bursts (400ms)
      const spreadShotCooldown = 400
      if (currentTime - lastShotTime > spreadShotCooldown) {
        // Fire 8 projectiles in an evenly-spaced fan pattern
        const numShots = 8
        const maxOffset = 0.3 // radians; narrower cone for tighter grouping
        const step = (maxOffset * 2) / (numShots - 1)
        const spreadAngles = Array.from({ length: numShots }, (_, i) => -maxOffset + i * step)
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
      if (tripleRocketActive) {
        // Fire 3 missiles with spread when in triple rocket mode
        const spreadAngles = [-0.15, 0, 0.15] // Spread pattern for triple rockets
        spreadAngles.forEach((angleOffset, index) => {
          const xOffset = index === 0 ? -0.5 : index === 2 ? 0.5 : 0
          const startPosition: [number, number, number] = [carPosition.x + xOffset, 2, carPosition.z]
          onMissileShoot(startPosition, carRotation + angleOffset, carVelocity)
        })
        setMissilesRemaining(prev => Math.max(0, prev - 3)) // Consume 3 missiles
      } else {
        // Normal single missile
        const startPosition: [number, number, number] = [carPosition.x, 2, carPosition.z]
        onMissileShoot(startPosition, carRotation, carVelocity)
        setMissilesRemaining(prev => prev - 1)
      }
      setLastMissileTime(currentTime)
    }
  }

  // Add missiles when rocket launcher is collected
  const addMissiles = (count: number = 5) => {
    setMissilesRemaining(prev => prev + count)
  }
  
  // Activate triple rocket mode
  const activateTripleRocketMode = (currentTime: number) => {
    setTripleRocketActive(true)
    setTripleRocketEndTime(currentTime + 12000) // 12 seconds duration
    setMissilesRemaining(prev => prev + 12) // Add 12 missiles
  }
  
  // Update triple rocket mode (deactivate when expired)
  const updateTripleRocketMode = (currentTime: number) => {
    if (tripleRocketActive && currentTime > tripleRocketEndTime) {
      setTripleRocketActive(false)
    }
  }

  // Get current weapon state for HUD
  const getWeaponState = (currentTime: number): WeaponState => ({
    spreadShotActive,
    spreadShotTimeRemaining: spreadShotActive ? Math.max(0, spreadShotEndTime - currentTime) : 0,
    missilesRemaining,
    tripleRocketActive,
    tripleRocketTimeRemaining: tripleRocketActive ? Math.max(0, tripleRocketEndTime - currentTime) : 0
  })

  return {
    // State
    spreadShotActive,
    missilesRemaining,
    tripleRocketActive,
    
    // Actions
    updateSpreadShot,
    handleShoot,
    handleMissileShoot,
    addMissiles,
    activateTripleRocketMode,
    updateTripleRocketMode,
    getWeaponState
  }
}