import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { DirectionalLight, Object3D } from 'three'
import { Environment } from '@react-three/drei'
import Car from './Car'
import SmoothRoad from './SmoothRoad'
import ObstacleManager from './ObstacleManager'
import ExplosionEffect from './ExplosionEffect'
import RetrowaveSun from './RetrowaveSun'
import Sky from './Sky'
import Mountains from './Mountains'
import CitySkyline from './CitySkyline'
import Bloom from './Bloom'
import WetRoad from './WetRoad'
import FlashLights from './FlashLights'
import FpsProbe from './FpsProbe'
import PlasmaProjectile from './PlasmaProjectile'
import AreaMissile from './AreaMissile'
import MissileExplosion from './MissileExplosion'
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

interface Missile {
  id: string
  position: [number, number, number]
  angle: number
  carVelocity: number
}

interface MissileExplosion {
  id: string
  position: [number, number, number]
}

function Scene() {
  const [carPosition, setCarPosition] = useState({ x: 0, z: 0 })
  const [obstacles, setObstacles] = useState<ObstacleData[]>([])
  const [explosions, setExplosions] = useState<Explosion[]>([])
  const [projectiles, setProjectiles] = useState<Projectile[]>([])
  const [missiles, setMissiles] = useState<Missile[]>([])
  const [missileExplosions, setMissileExplosions] = useState<MissileExplosion[]>([])
  const [score, setScore] = useState(0)
  // Wet road costs a full extra scene render per frame — OFF by default,
  // toggle with T (A/B for frame rate)
  const [wetRoadEnabled, setWetRoadEnabled] = useState(false)

  // T toggles the wet reflective road layer (perf A/B switch)
  useEffect(() => {
    const handleToggle = (event: KeyboardEvent) => {
      if (event.code === 'KeyT' && !event.repeat) {
        setWetRoadEnabled(v => !v)
      }
    }
    window.addEventListener('keydown', handleToggle)
    return () => window.removeEventListener('keydown', handleToggle)
  }, [])

  // Sun key light + its target, both riding with the car so lighting stays constant
  const sunLightRef = useRef<DirectionalLight>(null)
  const sunTargetRef = useRef<Object3D>(null)
  useEffect(() => {
    if (sunLightRef.current && sunTargetRef.current) {
      sunLightRef.current.target = sunTargetRef.current
    }
  }, [])

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

  // Player crash: spark burst at the contact point (reuses the explosion pool)
  const handlePlayerCrash = useCallback((position: [number, number, number]) => {
    const explosionId = `explosion-${Date.now()}-${Math.random()}`
    setExplosions(prev => [...prev, { id: explosionId, position }])
  }, [])

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

  const handleMissileShoot = useCallback((startPosition: [number, number, number], angle: number, carVelocity: number) => {
    const missileId = `missile-${Date.now()}-${Math.random()}`
    const newMissile = {
      id: missileId,
      position: startPosition,
      angle: angle,
      carVelocity: carVelocity
    }

    setMissiles(prev => [...prev, newMissile])
  }, [])

  const handleMissileHit = useCallback((missileId: string, explosionCenter: [number, number, number], hitObstacleIds: string[]) => {
    // Remove the missile
    setMissiles(prev => prev.filter(missile => missile.id !== missileId))
    
    // Create missile explosion effect
    const explosionId = `missile-explosion-${Date.now()}-${Math.random()}`
    setMissileExplosions(prev => [...prev, {
      id: explosionId,
      position: explosionCenter
    }])
    
    // Remove all hit obstacles and add score
    setObstacles(prev => {
      const remainingObstacles = prev.filter(obs => !hitObstacleIds.includes(obs.id))
      
      // Add score for each destroyed car
      const destroyedCars = hitObstacleIds.length
      if (destroyedCars > 0) {
        setScore(prevScore => prevScore + (destroyedCars * 25)) // 25 points per car destroyed
      }
      
      return remainingObstacles
    })
  }, [])

  const handleMissileExpire = useCallback((missileId: string) => {
    setMissiles(prev => prev.filter(missile => missile.id !== missileId))
  }, [])

  const handleMissileExplosionComplete = useCallback((explosionId: string) => {
    setMissileExplosions(prev => prev.filter(exp => exp.id !== explosionId))
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
      {/* Atmosphere */}
      <fog attach="fog" args={['#160527', 80, 250]} />
      <Sky />
      {/* Image-based lighting: real reflections on the metal/paint (sky stays procedural) */}
      <Environment files="/hdri/venice_sunset_1k.hdr" background={false} />
      <Bloom />

      {/* Lighting rig — violet sky bounce + warm sun key + neon rim lights */}
      <ambientLight intensity={0.18} color="#8a7bff" />
      <hemisphereLight args={['#3b1b6e', '#0a0510', 0.6]} />
      <group position={[0, 0, carPosition.z]}>
        <directionalLight
          ref={sunLightRef}
          position={[14, 26, -50]}
          intensity={1.25}
          color="#ff9a5c"
        />
        <object3D ref={sunTargetRef} position={[0, 0, 10]} />
        {/* Neon rim lights flanking the road near the car */}
        <pointLight position={[-16, 5, -25]} intensity={60} distance={70} decay={2} color="#ff2bd6" />
        <pointLight position={[16, 5, -25]} intensity={60} distance={70} decay={2} color="#00f0ff" />
      </group>

      {/* Persistent pooled flash lights for explosions/crashes — constant
          light count, so no mid-game shader recompiles */}
      <FlashLights />

      {/* FPS readout → #fps-meter DOM node (direct DOM, no re-renders) */}
      <FpsProbe />

      <RetrowaveSun carZ={carPosition.z} />
      <Mountains carZ={carPosition.z} />
      <CitySkyline carZ={carPosition.z} />
      <SmoothRoad carZ={carPosition.z} />
      {wetRoadEnabled && <WetRoad carZ={carPosition.z} />}
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
        onRewardCollected={handleRewardCollected}
        onShoot={handleShoot}
        onSpreadShoot={handleSpreadShoot}
        onMissileShoot={handleMissileShoot}
        score={score}
        onScoreUpdate={setScore}
        onEnemyCarBounce={handleEnemyCarBounce}
        onPlayerCrash={handlePlayerCrash}
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
      
      {/* Render area missiles */}
      {missiles.map(missile => (
        <AreaMissile
          key={missile.id}
          position={missile.position}
          angle={missile.angle}
          carVelocity={missile.carVelocity}
          missileId={missile.id}
          obstacles={obstacles}
          onHit={handleMissileHit}
          onExpire={handleMissileExpire}
        />
      ))}
      
      {/* Render missile explosions */}
      {missileExplosions.map(explosion => (
        <MissileExplosion
          key={explosion.id}
          position={explosion.position}
          onComplete={() => handleMissileExplosionComplete(explosion.id)}
        />
      ))}
    </>
  )
}

export default memo(Scene)