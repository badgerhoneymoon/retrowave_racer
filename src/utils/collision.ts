export interface BoundingBox {
  x: number
  z: number
  width: number
  depth: number
}

export interface ObstacleData {
  id: string
  x: number
  z: number
  type: 'reward' | 'cone' | 'car'
}

export interface CollisionResult {
  hit: boolean
  obstacle?: ObstacleData
  isBoost?: boolean
  isReward?: boolean
}

// Get bounding box for car (2x4 units)
export const getCarBounds = (x: number, z: number): BoundingBox => ({
  x: x - 1, // Car width: 2 units
  z: z - 2, // Car length: 4 units
  width: 2,
  depth: 4
})

// Get bounding box for obstacles
export const getObstacleBounds = (obstacle: ObstacleData): BoundingBox => {
  switch (obstacle.type) {
    case 'reward':
      return {
        x: obstacle.x - 0.5,
        z: obstacle.z - 0.5,
        width: 1,
        depth: 1
      }
    case 'cone':
      return {
        x: obstacle.x - 0.5,
        z: obstacle.z - 0.5,
        width: 1,
        depth: 1
      }
    case 'car':
      return {
        x: obstacle.x - 0.9,
        z: obstacle.z - 1.75,
        width: 1.8,
        depth: 3.5
      }
    default:
      return { x: 0, z: 0, width: 0, depth: 0 }
  }
}

// AABB collision detection
export const checkAABBCollision = (box1: BoundingBox, box2: BoundingBox): boolean => {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.z < box2.z + box2.depth &&
    box1.z + box1.depth > box2.z
  )
}

// Get obstacles within collision range of car
export const getObstaclesInRange = (
  obstacles: ObstacleData[],
  carX: number,
  carZ: number,
  range: number = 10
): ObstacleData[] => {
  return obstacles.filter(obstacle => {
    const dx = Math.abs(obstacle.x - carX)
    const dz = Math.abs(obstacle.z - carZ)
    return dx < range && dz < range
  })
}

// Check collision between car and obstacles
export const checkCollisions = (
  carX: number, 
  carZ: number, 
  obstacles: ObstacleData[]
): CollisionResult => {
  const carBounds = getCarBounds(carX, carZ)
  
  for (const obstacle of obstacles) {
    const obstacleBounds = getObstacleBounds(obstacle)
    
    if (checkAABBCollision(carBounds, obstacleBounds)) {
      const isBoost = obstacle.type === 'cone' // Cones are boost items
      const isReward = obstacle.type === 'reward' // Rewards are point pickups
      return { hit: true, obstacle, isBoost, isReward }
    }
  }
  
  return { hit: false }
}