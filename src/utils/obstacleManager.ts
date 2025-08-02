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
  const lanePositions = [-12, -6, 0, 6, 12] // Five lanes across full road width
  
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
    
    // Choose a random lane
    const laneIndex = Math.floor(Math.random() * lanePositions.length)
    const x = lanePositions[laneIndex]
    
    obstacles.push({
      id: `obstacle-${currentZ}-${x}`,
      x,
      z: currentZ,
      type
    })
  }
  
  return obstacles
}

// Update obstacles based on car position
export const updateObstacles = (
  currentObstacles: ObstacleData[],
  carZ: number,
  aheadDistance: number = 300,
  behindDistance: number = 50
): ObstacleData[] => {
  // Car moves in negative Z direction, so "ahead" is more negative
  // Keep obstacles from (carZ - aheadDistance) to (carZ + behindDistance)
  const visibleObstacles = currentObstacles.filter(
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

