import { useRef } from 'react'
import { PowerupState } from './useCarPowerups'
import { WeaponState } from './useCarWeapons'

export function useCarHUD() {
  const frameCountRef = useRef(0)

  // Update HUD displays with direct DOM manipulation for performance
  const updateHUD = (
    speed: number,
    score: number,
    powerupState: PowerupState,
    weaponState: WeaponState
  ) => {
    frameCountRef.current += 1
    
    // Throttle updates to every 6 frames for performance
    if (frameCountRef.current % 6 !== 0) return

    // Update speed display directly
    const speedPercent = Math.round((Math.abs(speed) / 1.8) * 100)
    const speedElement = document.querySelector('[data-hud="speed-value"]') as HTMLElement
    const speedBarElement = document.querySelector('[data-hud="speed-bar"]') as HTMLElement
    if (speedElement) {
      speedElement.textContent = `${speedPercent}%`
      speedElement.style.color = powerupState.isBoosted ? '#00ff00' : '#00ffff'
    }
    if (speedBarElement) {
      speedBarElement.style.width = `${Math.min(100, speedPercent)}%`
      speedBarElement.style.backgroundColor = powerupState.isBoosted ? '#00ff00' : '#00ffff'
      speedBarElement.style.boxShadow = powerupState.isBoosted ? '0 0 10px #00ff00' : '0 0 10px #00ffff'
    }
    
    // Update score display directly
    const scoreElement = document.querySelector('[data-hud="score-value"]') as HTMLElement
    if (scoreElement) {
      scoreElement.textContent = score.toLocaleString()
    }
    
    // Update missiles display directly
    const missilesElement = document.querySelector('[data-hud="missiles-value"]') as HTMLElement
    if (missilesElement) {
      missilesElement.textContent = `🚀 ${weaponState.missilesRemaining}`
      missilesElement.style.color = weaponState.missilesRemaining > 0 ? '#ff4400' : '#666666'
    }
    
    // Update boost display directly
    const boostContainer = document.querySelector('[data-hud="boost-container"]') as HTMLElement
    const boostValueElement = document.querySelector('[data-hud="boost-value"]') as HTMLElement
    const boostBarElement = document.querySelector('[data-hud="boost-bar"]') as HTMLElement
    if (boostContainer) {
      boostContainer.style.display = powerupState.isBoosted ? 'block' : 'none'
    }
    if (boostValueElement && powerupState.isBoosted) {
      const boostSeconds = Math.max(0, Math.ceil(powerupState.boostTimeRemaining / 1000))
      boostValueElement.textContent = `${boostSeconds}s`
    }
    if (boostBarElement && powerupState.isBoosted) {
      boostBarElement.style.width = `${(powerupState.boostTimeRemaining / 5000) * 100}%`
    }
    
    // Update spread shot display directly
    const spreadContainer = document.querySelector('[data-hud="spread-container"]') as HTMLElement
    const spreadValueElement = document.querySelector('[data-hud="spread-value"]') as HTMLElement
    const spreadBarElement = document.querySelector('[data-hud="spread-bar"]') as HTMLElement
    if (spreadContainer) {
      spreadContainer.style.display = weaponState.spreadShotActive ? 'block' : 'none'
    }
    if (spreadValueElement && weaponState.spreadShotActive) {
      const spreadSeconds = Math.max(0, Math.ceil(weaponState.spreadShotTimeRemaining / 1000))
      spreadValueElement.textContent = `${spreadSeconds}s`
    }
    if (spreadBarElement && weaponState.spreadShotActive) {
      spreadBarElement.style.width = `${(weaponState.spreadShotTimeRemaining / 5000) * 100}%`
    }
  }

  return {
    updateHUD
  }
}