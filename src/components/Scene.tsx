import { useState } from 'react'
import Car from './Car'
import Road from './Road'
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
}

interface SceneProps {
  onHUDUpdate: (hudData: { speed: number, isBoosted: boolean, boostTimeRemaining: number, score: number }) => void
}

function Scene({ onHUDUpdate }: SceneProps) {
  const [carPosition, setCarPosition] = useState({ x: 0, z: 0 })
  const [obstacles, setObstacles] = useState<ObstacleData[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])

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

  const handleShoot = (startPosition: [number, number, number], angle: number) => {
    const projectileId = `projectile-${Date.now()}-${Math.random()}`
    setProjectiles(prev => [...prev, {
      id: projectileId,
      position: startPosition,
      angle: angle
    }])
  }

  const handleProjectileHit = (projectileId: string, targetPosition: [number, number, number]) => {
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
  }

  const handleProjectileExpire = (projectileId: string) => {
    setProjectiles(prev => prev.filter(proj => proj.id !== projectileId))
  }

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
      
      <RetrowaveSun carZ={Math.round(carPosition.z / 2) * 2} />
      <Road carZ={carPosition.z} />
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