
import { memo } from 'react'
import { geometryCache } from '../utils/geometryCache'

interface ObstacleProps {
  position: [number, number, number]
  type: 'reward' | 'cone' | 'car' | 'rocket_launcher'
}

function Obstacle({ position, type }: ObstacleProps) {
  const renderObstacle = () => {
    switch (type) {
      case 'reward':
        return (
          <group position={position}>
            {/* Main crystal/gem shape */}
            <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]} geometry={geometryCache.getGeometry('reward-cube')}>
              <meshStandardMaterial 
                color="#ffff00" 
                emissive="#ffaa00" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={0.3}
                transparent
                opacity={0.9}
              />
            </mesh>
            {/* Inner glow effect */}
            <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 4, Math.PI / 4, 0]} geometry={geometryCache.getGeometry('reward-inner')}>
              <meshStandardMaterial 
                color="#ffffff" 
                emissive="#ffff00" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={0.5}
                transparent
                opacity={0.4}
              />
            </mesh>
          </group>
        )
      case 'cone':
        return (
          <mesh position={position} geometry={geometryCache.getGeometry('cone')}>
            <meshStandardMaterial color="#00ff80" emissive="#004020" />
          </mesh>
        )
      case 'car':
        return (
          <group position={position}>
            <mesh position={[0, 0.3, 0]} geometry={geometryCache.getGeometry('blue-car-body')}>
              <meshStandardMaterial color="#0080ff" />
            </mesh>
            <mesh position={[0, 0.7, 0.5]} geometry={geometryCache.getGeometry('blue-car-windshield')}>
              <meshStandardMaterial color="#0040ff" transparent opacity={0.8} />
            </mesh>
          </group>
        )
      case 'rocket_launcher':
        return (
          <group position={position}>
            {/* Base platform */}
            <mesh position={[0, 0.1, 0]} geometry={geometryCache.getGeometry('launcher-base')}>
              <meshStandardMaterial 
                color="#333333" 
                metalness={0.8}
                roughness={0.2}
              />
            </mesh>
            
            {/* Main launcher body */}
            <mesh position={[0, 0.6, 0]} geometry={geometryCache.getGeometry('launcher-body')}>
              <meshStandardMaterial 
                color="#ff4400" 
                emissive="#ff1100" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={0.2}
                metalness={0.6}
                roughness={0.3}
              />
            </mesh>
            
            {/* Missile tubes */}
            <mesh position={[-0.3, 0.8, 0.2]} geometry={geometryCache.getGeometry('launcher-tube')}>
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[0.3, 0.8, 0.2]} geometry={geometryCache.getGeometry('launcher-tube')}>
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[-0.3, 0.8, -0.2]} geometry={geometryCache.getGeometry('launcher-tube')}>
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[0.3, 0.8, -0.2]} geometry={geometryCache.getGeometry('launcher-tube')}>
              <meshStandardMaterial color="#444444" />
            </mesh>
            <mesh position={[0, 0.8, 0]} geometry={geometryCache.getGeometry('launcher-tube')}>
              <meshStandardMaterial color="#444444" />
            </mesh>
            
            {/* Warning lights */}
            <mesh position={[-0.5, 0.9, 0.5]} geometry={geometryCache.getGeometry('launcher-light')}>
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={0.8}
              />
            </mesh>
            <mesh position={[0.5, 0.9, 0.5]} geometry={geometryCache.getGeometry('launcher-light')}>
              <meshStandardMaterial 
                color="#ff0000" 
                emissive="#ff0000" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={0.8}
              />
            </mesh>
            
            {/* Glowing pickup indicator - using emissive instead of pointLight for performance */}
            <mesh position={[0, 1.2, 0]} geometry={geometryCache.getGeometry('launcher-glow')}>
              <meshStandardMaterial 
                color="#ff4400" 
                emissive="#ff4400" 
                // eslint-disable-next-line react/no-unknown-property
                emissiveIntensity={1.5}
                transparent
                opacity={0.8}
              />
            </mesh>
          </group>
        )
      default:
        return null
    }
  }

  return renderObstacle()
}

export default memo(Obstacle)