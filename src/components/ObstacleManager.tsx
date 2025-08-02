import { useEffect, useRef } from 'react'
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
  const lastUpdateLengthRef = useRef(0)
  const lastCarZRef = useRef(carPosition.z)
  
  // Initialize obstacles on mount
  useEffect(() => {
    if (obstacles.length === 0) {
      const initialObstacles = generateObstaclesForRange(
        carPosition.z - 400,  // Generate far ahead (more negative Z)
        carPosition.z - 20    // Start obstacles close ahead
      )
      onObstaclesUpdate(initialObstacles)
      lastUpdateLengthRef.current = initialObstacles.length
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount to avoid regenerating obstacles constantly

  // Update obstacles each frame
  useFrame((_state, delta) => {
    const updated = updateObstacles(obstacles, carPosition.z, delta)
    
    // Check if we have moving obstacles that need position updates
    const hasMovingCars = obstacles.some(o => o.type === 'car' && o.velocity !== undefined)
    
    // Use dirty flag instead of expensive array comparison
    const carMovedSignificantly = Math.abs(carPosition.z - lastCarZRef.current) > 10
    const lengthChanged = updated.length !== lastUpdateLengthRef.current
    
    // Always update if there are moving cars, or if car moved significantly, or length changed
    if (hasMovingCars || lengthChanged || carMovedSignificantly) {
      onObstaclesUpdate(updated)
      lastUpdateLengthRef.current = updated.length
      lastCarZRef.current = carPosition.z
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