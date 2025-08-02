import { useState, useCallback } from 'react'
import Car from './Car'
import SmoothRoad from './SmoothRoad'
import ObstacleManager from './ObstacleManager'
import ExplosionEffect from './ExplosionEffect'
import RetrowaveSun from './RetrowaveSun'
import PlasmaProjectile from './PlasmaProjectile'
import { ObstacleData } from '../utils/collision'

interface Explosion {
  id: string
  position: [number, number, number]
}

interface Projectile {
  id: string
  position: [number, number, number]
  angle: number
  carVelocity: number
}

interface SceneProps {
  onHUDUpdate: (hudData: { speed: number, isBoosted: boolean, boostTimeRemaining: number, score: number, spreadShotActive: boolean, spreadShotTimeRemaining: number }) => void
}

function Scene({ onHUDUpdate }: SceneProps) {
  const [carPosition, setCarPosition] = useState({ x: 0, z: 0 })
  const [obstacles, setObstacles] = useState<ObstacleData[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [score, setScore] = useState(0)

  const handleObstaclesUpdate = (newObstacles: ObstacleData[]) => {
    setObstacles(newObstacles)
  }

  const handleObstacleCollected = (obstacleId: string) => {
    setObstacles(prev => prev.filter(obs => obs.id !== obstacleId))
  }

  const handleRewardCollected = (_points: number, position: [number, number, number]) => {
    // Create an explosion at the exact reward position
    const explosionId = `explosion-${Date.now()}-${Math.random()}`
    
    setExplosions(prev => [...prev, {
      id: explosionId,
      position: position
    }])
  }

  const handleExplosionComplete = (explosionId: string) => {
    setExplosions(prev => prev.filter(exp => exp.id !== explosionId))
  }

  const handleShoot = useCallback((startPosition: [number, number, number], angle: number, carVelocity: number) => {
    setProjectiles(prev => {
      // Limit max projectiles to prevent performance issues
      const maxProjectiles = 8
      let newProjectiles = prev
      
      // Remove oldest projectiles if we're at the limit
      if (prev.length >= maxProjectiles) {
        newProjectiles = prev.slice(1) // Remove the first (oldest) projectile
      }
      
      const projectileId = `projectile-${Date.now()}-${Math.random()}`
      return [...newProjectiles, {
        id: projectileId,
        position: startPosition,
        angle: angle,
        carVelocity: carVelocity
      }]
    })
  }, [])

  const handleProjectileHit = useCallback((projectileId: string, targetPosition: [number, number, number]) => {
    // Remove the projectile
    setProjectiles(prev => prev.filter(proj => proj.id !== projectileId))
    
    // Find the blue car that was hit and remove it
    setObstacles(prev => {
      const hitObstacle = prev.find(obs => {
        const dx = Math.abs(obs.x - targetPosition[0])
        const dz = Math.abs(obs.z - targetPosition[2])
        return obs.type === 'car' && dx < 2 && dz < 3
      })
      
      if (hitObstacle) {
        // Add 10 points for destroying a car
        setScore(prev => prev + 10)
        
        // Create explosion at the destroyed car position
        const explosionId = `explosion-${Date.now()}-${Math.random()}`
        setExplosions(prevExp => [...prevExp, {
          id: explosionId,
          position: [hitObstacle.x, 1, hitObstacle.z]
        }])
        
        // Remove the destroyed car
        return prev.filter(obs => obs.id !== hitObstacle.id)
      }
      
      return prev
    })
  }, [])

  const handleProjectileExpire = useCallback((projectileId: string) => {
    setProjectiles(prev => prev.filter(proj => proj.id !== projectileId))
  }, [])

  const handleSpreadShoot = useCallback((shots: Array<{ position: [number, number, number], angle: number, carVelocity: number }>) => {
    setProjectiles(prev => {
      // Limit max projectiles to prevent performance issues
      const maxProjectiles = 16 // Increased for spread shot
      let newProjectiles = prev
      
      // Remove oldest projectiles if adding spread shot would exceed limit
      const totalNewProjectiles = shots.length
      if (prev.length + totalNewProjectiles > maxProjectiles) {
        const projectilesToRemove = (prev.length + totalNewProjectiles) - maxProjectiles
        newProjectiles = prev.slice(projectilesToRemove)
      }
      
      const newShots = shots.map((shot, index) => ({
        id: `spread-projectile-${Date.now()}-${index}`,
        position: shot.position,
        angle: shot.angle,
        carVelocity: shot.carVelocity
      }))
      
      return [...newProjectiles, ...newShots]
    })
  }, [])

  const handleEnemyCarBounce = useCallback((obstacleId: string, newVelocity: number, bounceDistance: number) => {
    setObstacles(prev => prev.map(obstacle => {
      if (obstacle.id === obstacleId && obstacle.type === 'car') {
        const recoveryTime = Date.now() + 2000 // Recover after 2 seconds
        return {
          ...obstacle,
          velocity: newVelocity,
          z: obstacle.z + bounceDistance, // Apply immediate bounce displacement
          bounceRecoveryTime: recoveryTime // Set recovery time
        }
      }
      return obstacle
    }))
  }, [])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight 
        position={[10, 10, 5]} 
        intensity={1}
        color="#ff6600"
      />
      <pointLight 
        position={[0, 10, 0]} 
        intensity={0.5}
        color="#ff00ff"
      />
      
      <RetrowaveSun carZ={carPosition.z} />
      <SmoothRoad carZ={carPosition.z} />
      <ObstacleManager 
        carPosition={carPosition} 
        obstacles={obstacles}
        onObstaclesUpdate={handleObstaclesUpdate} 
      />
      <Car 
        position={[0, 0, 0]} 
        onPositionChange={setCarPosition}
        obstacles={obstacles}
        onObstacleCollected={handleObstacleCollected}
        onHUDUpdate={onHUDUpdate}
        onRewardCollected={handleRewardCollected}
        onShoot={handleShoot}
        onSpreadShoot={handleSpreadShoot}
        score={score}
        onScoreUpdate={setScore}
        onEnemyCarBounce={handleEnemyCarBounce}
      />
      
      {/* Render explosion effects */}
      {explosions.map(explosion => (
        <ExplosionEffect
          key={explosion.id}
          position={explosion.position}
          onComplete={() => handleExplosionComplete(explosion.id)}
        />
      ))}
      
      {/* Render plasma projectiles */}
      {projectiles.map(projectile => (
        <PlasmaProjectile
          key={projectile.id}
          position={projectile.position}
          angle={projectile.angle}
          carVelocity={projectile.carVelocity}
          projectileId={projectile.id}
          obstacles={obstacles}
          onHit={handleProjectileHit}
          onExpire={handleProjectileExpire}
        />
      ))}
    </>
  )
}

export default Scene