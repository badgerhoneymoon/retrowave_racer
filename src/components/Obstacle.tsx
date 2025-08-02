
interface ObstacleProps {
  position: [number, number, number]
  type: 'reward' | 'cone' | 'car'
}

function Obstacle({ position, type }: ObstacleProps) {
  const renderObstacle = () => {
    switch (type) {
      case 'reward':
        return (
          <group position={position}>
            {/* Main crystal/gem shape */}
            <mesh position={[0, 0.5, 0]} rotation={[0, Math.PI / 4, 0]}>
              <boxGeometry args={[1, 1, 1]} />
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
            <mesh position={[0, 0.5, 0]} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
              <boxGeometry args={[0.8, 0.8, 0.8]} />
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
          <mesh position={position}>
            <coneGeometry args={[0.5, 1.5, 8]} />
            <meshStandardMaterial color="#00ff80" emissive="#004020" />
          </mesh>
        )
      case 'car':
        return (
          <group position={position}>
            <mesh position={[0, 0.3, 0]}>
              <boxGeometry args={[1.8, 0.6, 3.5]} />
              <meshStandardMaterial color="#0080ff" />
            </mesh>
            <mesh position={[0, 0.7, 0.5]}>
              <boxGeometry args={[1.4, 0.4, 1.2]} />
              <meshStandardMaterial color="#0040ff" transparent opacity={0.8} />
            </mesh>
          </group>
        )
      default:
        return null
    }
  }

  return renderObstacle()
}

export default Obstacle