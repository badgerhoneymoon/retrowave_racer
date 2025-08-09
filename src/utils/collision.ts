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
  type: 'reward' | 'cone' | 'car' | 'rocket_launcher' | 'triple_rocket'
  velocity?: number // Z-axis velocity for moving cars (positive = towards camera, negative = away)
  lane?: 'left' | 'right' // Lane assignment for cars
  originalVelocity?: number // Original velocity before bounce for recovery
  bounceRecoveryTime?: number // Timestamp when car should recover from bounce
}

export interface CollisionResult {
  hit: boolean
  obstacle?: ObstacleData
  isBoost?: boolean
  isReward?: boolean
  isRocketLauncher?: boolean
  isTripleRocket?: boolean
  enemyCarBounce?: {
    newVelocity: number
    bounceDistance: number
  }
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
    case 'rocket_launcher':
      return {
        x: obstacle.x - 0.8,
        z: obstacle.z - 0.8,
        width: 1.6,
        depth: 1.6
      }
    case 'triple_rocket':
      return {
        x: obstacle.x - 0.8,
        z: obstacle.z - 0.8,
        width: 1.6,
        depth: 1.6
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
  obstacles: ObstacleData[],
  carSpeed: number = 0
): CollisionResult => {
  const carBounds = getCarBounds(carX, carZ)
  
  for (const obstacle of obstacles) {
    const obstacleBounds = getObstacleBounds(obstacle)
    
    if (checkAABBCollision(carBounds, obstacleBounds)) {
      const isBoost = obstacle.type === 'cone' // Cones are boost items
      const isReward = obstacle.type === 'reward' // Rewards are point pickups
      const isRocketLauncher = obstacle.type === 'rocket_launcher' // Rocket launcher pickups
      const isTripleRocket = obstacle.type === 'triple_rocket' // Triple rocket mode pickups
      
      // Calculate enemy car bounce if it's a car collision
      let enemyCarBounce: { newVelocity: number; bounceDistance: number } | undefined
      
      if (obstacle.type === 'car' && !isBoost && !isReward && !isRocketLauncher && !isTripleRocket) {
        const enemyVelocity = obstacle.velocity || 0
        
        // Convert player speed (forward +Z speed is positive) to world Z velocity (negative Z means forward in the scene)
        // Hence multiply by -60 so that a player driving forward has a NEGATIVE Z velocity like same-direction traffic.
        const playerVelocity = -carSpeed * 60
        
        // Determine collision type - but with MUCH simpler logic
        const movingSameDirection = (playerVelocity < 0 && enemyVelocity < 0) || (playerVelocity > 0 && enemyVelocity > 0)
        const playerFaster = Math.abs(playerVelocity) > Math.abs(enemyVelocity)
        
        if (Math.abs(playerVelocity) > 3) {  // Only bounce if player has significant speed
          if (movingSameDirection && playerFaster) {
            // Rear-end collision: use **relative speed** between the two cars so a bigger speed difference ⇒ bigger shove.
            const relativeSpeed = Math.abs(playerVelocity - enemyVelocity)
            const pushDistance  = Math.min(relativeSpeed * 0.2, 15)
            const velocityBoost = Math.min(relativeSpeed * 0.04, 5)

            // Increase the enemy speed in its own travel direction so it pulls away.
            const newVelocity = enemyVelocity < 0
              ? enemyVelocity - velocityBoost
              : enemyVelocity + velocityBoost

            // Push further along enemy's travel direction.
            const bounceDistance = enemyVelocity < 0 ? -pushDistance : pushDistance

            enemyCarBounce = { newVelocity, bounceDistance }
          } else {
            // Head-on / crossing collision – use combined speeds for a beefier hit.
            const relativeSpeed  = Math.abs(playerVelocity) + Math.abs(enemyVelocity)
            const bounceIntensity = Math.min(relativeSpeed * 0.25, 25)
            const newVelocity     = enemyVelocity * 0.8  // lose some speed but keep direction
            const bounceDistance  = enemyVelocity > 0 ? -bounceIntensity : bounceIntensity
            
            enemyCarBounce = { newVelocity, bounceDistance }
          }
        }
      }
      
      return { hit: true, obstacle, isBoost, isReward, isRocketLauncher, isTripleRocket, enemyCarBounce }
    }
  }
  
  return { hit: false }
}