import { ObstacleData } from './collision'

export interface ObstacleConfig {
  minSpacing: number
  maxSpacing: number
  roadWidth: number
  laneWidth: number
}

const defaultConfig: ObstacleConfig = {
  minSpacing: 30,  // Minimum distance between obstacles
  maxSpacing: 60,  // Maximum distance between obstacles
  roadWidth: 36,   // Road width (-18 to +18) 
  laneWidth: 6     // Width of each lane
}

// Generate obstacles for a specific Z range
export const generateObstaclesForRange = (
  startZ: number, 
  endZ: number, 
  config: ObstacleConfig = defaultConfig
): ObstacleData[] => {
  const obstacles: ObstacleData[] = []
  const { minSpacing, maxSpacing } = config
  
  // Define lane positions across the full width (5 lanes)
  // Left lanes: -12, -6 (oncoming traffic)
  // Center lane: 0 (neutral zone - no cars)
  // Right lanes: 6, 12 (same direction traffic)
  const leftLanes = [-12, -6]   // Oncoming traffic (positive velocity - towards camera)
  const rightLanes = [6, 12]    // Same direction (negative velocity - away from camera)
  const allLanes = [...leftLanes, ...rightLanes] // Center lane (0) excluded from car generation
  
  let currentZ = Math.ceil(startZ / 10) * 10 // Start at next 10-unit boundary
  
  while (currentZ < endZ) {
    // Random spacing between obstacles
    const spacing = minSpacing + Math.random() * (maxSpacing - minSpacing)
    currentZ += spacing
    
    if (currentZ >= endZ) break
    
    // Randomly choose obstacle type with weighted probabilities
    const rand = Math.random()
    let type: 'reward' | 'cone' | 'car'
    
    if (rand < 0.15) {
      type = 'reward'  // 15% chance - more frequent reward pickups
    } else if (rand < 0.35) {
      type = 'cone'    // 20% chance - boost items  
    } else {
      type = 'car'     // 65% chance - fewer obstacles to avoid
    }
    
    // For cars, choose from car lanes; for rewards/cones, use all lanes including center
    let x: number
    let velocity: number | undefined
    let lane: 'left' | 'right' | undefined
    
    if (type === 'car') {
      // Cars only spawn in left/right lanes, not center
      const laneIndex = Math.floor(Math.random() * allLanes.length)
      x = allLanes[laneIndex]
      
      // Assign velocity based on lane
      if (leftLanes.includes(x)) {
        velocity = 30  // Oncoming traffic (positive = towards camera)
        lane = 'left'
      } else {
        velocity = -20 // Same direction traffic (negative = away from camera)
        lane = 'right'
      }
    } else {
      // Rewards and cones can spawn in any lane including center
      const allPositions = [-12, -6, 0, 6, 12]
      const laneIndex = Math.floor(Math.random() * allPositions.length)
      x = allPositions[laneIndex]
      // Static obstacles don't have velocity
    }
    
    obstacles.push({
      id: `obstacle-${currentZ}-${x}`,
      x,
      z: currentZ,
      type,
      velocity,
      lane,
      originalVelocity: velocity // Store original velocity for recovery
    })
  }
  
  return obstacles
}

// Update moving obstacles positions and handle recovery
export const updateMovingObstacles = (
  obstacles: ObstacleData[],
  deltaTime: number,
  currentTime: number = Date.now()
): ObstacleData[] => {
  return obstacles.map(obstacle => {
    if (obstacle.type === 'car' && obstacle.velocity !== undefined) {
      let updatedObstacle = { ...obstacle }
      
      // Check if car should recover from bounce
      if (obstacle.bounceRecoveryTime && currentTime > obstacle.bounceRecoveryTime) {
        // Recover to original velocity
        updatedObstacle = {
          ...updatedObstacle,
          velocity: obstacle.originalVelocity || 0,
          bounceRecoveryTime: undefined // Clear recovery time
        }
      }
      
      // Move car based on its current velocity
      updatedObstacle.z = updatedObstacle.z + (updatedObstacle.velocity || 0) * deltaTime
      
      return updatedObstacle
    }
    return obstacle
  })
}

// Update obstacles based on car position
export const updateObstacles = (
  currentObstacles: ObstacleData[],
  carZ: number,
  deltaTime: number = 0.016, // Default 60fps frame time
  aheadDistance: number = 300,
  behindDistance: number = 50
): ObstacleData[] => {
  // First, update moving obstacles positions and handle recovery
  const movedObstacles = updateMovingObstacles(currentObstacles, deltaTime, Date.now())
  
  // Car moves in negative Z direction, so "ahead" is more negative
  // Keep obstacles from (carZ - aheadDistance) to (carZ + behindDistance)
  const visibleObstacles = movedObstacles.filter(
    obstacle => obstacle.z > carZ - aheadDistance && obstacle.z < carZ + behindDistance
  )
  
  // Check if we need to generate new obstacles ahead (more negative Z)
  const minZ = Math.min(...visibleObstacles.map(o => o.z), carZ + 1)
  const targetMinZ = carZ - aheadDistance
  
  // Generate new obstacles when we're getting close to the edge
  if (targetMinZ < minZ - 50) {
    const newObstacles = generateObstaclesForRange(targetMinZ, minZ - 10)
    return [...visibleObstacles, ...newObstacles]
  }
  
  return visibleObstacles
}

