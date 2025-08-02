import { useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import Obstacle from './Obstacle'
import { ObstacleData } from '../utils/collision'
import { updateObstacles, generateObstaclesForRange } from '../utils/obstacleManager'

interface ObstacleManagerProps {
  carPosition: { x: number, z: number }
  obstacles: ObstacleData[]
  onObstaclesUpdate: (obstacles: ObstacleData[]) => void
}

function ObstacleManager({ carPosition, obstacles, onObstaclesUpdate }: ObstacleManagerProps) {
  // Initialize obstacles on mount
  useEffect(() => {
    if (obstacles.length === 0) {
      const initialObstacles = generateObstaclesForRange(
        carPosition.z - 400,  // Generate far ahead (more negative Z)
        carPosition.z - 20    // Start obstacles close ahead
      )
      onObstaclesUpdate(initialObstacles)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount to avoid regenerating obstacles constantly

  // Update obstacles each frame
  useFrame((_state, delta) => {
    const updated = updateObstacles(obstacles, carPosition.z, delta)
    
    // Only update parent if obstacles changed or moved
    if (updated.length !== obstacles.length || 
        updated.some((obs, i) => 
          obstacles[i]?.id !== obs.id || 
          Math.abs(obstacles[i]?.z - obs.z) > 0.1 // Check if position changed significantly
        )) {
      onObstaclesUpdate(updated)
    }
  })

  return (
    <group>
      {obstacles.map(obstacle => (
        <Obstacle
          key={obstacle.id}
          position={[obstacle.x, 0, obstacle.z]}
          type={obstacle.type}
        />
      ))}
    </group>
  )
}

export default ObstacleManager