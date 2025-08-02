import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface ExplosionParticle {
  id: string
  position: [number, number, number]
  velocity: [number, number, number]
  life: number
  maxLife: number
  scale: number
}

interface ExplosionEffectProps {
  position: [number, number, number]
  onComplete: () => void
}

function ExplosionEffect({ position, onComplete }: ExplosionEffectProps) {
  const groupRef = useRef<Group>(null)
  const [particles, setParticles] = useState<ExplosionParticle[]>([])

  useEffect(() => {
    // Create explosion particles
    const newParticles: ExplosionParticle[] = []
    const particleCount = 12

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2
      const speed = 8 + Math.random() * 4
      const upwardSpeed = 6 + Math.random() * 8
      
      newParticles.push({
        id: `particle-${i}`,
        position: [position[0], position[1], position[2]],
        velocity: [
          Math.cos(angle) * speed,
          upwardSpeed,
          Math.sin(angle) * speed
        ],
        life: 1.0,
        maxLife: 1.0,
        scale: 0.3 + Math.random() * 0.4
      })
    }

    setParticles(newParticles)
  }, [position])

  useFrame((_state, delta) => {
    setParticles(prevParticles => {
      const updatedParticles = prevParticles.map(particle => {
        const newLife = particle.life - delta * 2.0 // Particles last 0.5 seconds
        
        if (newLife <= 0) return null

        // Update position based on velocity
        const newPosition: [number, number, number] = [
          particle.position[0] + particle.velocity[0] * delta,
          particle.position[1] + particle.velocity[1] * delta,
          particle.position[2] + particle.velocity[2] * delta
        ]

        // Apply gravity to velocity
        const newVelocity: [number, number, number] = [
          particle.velocity[0] * 0.98, // Air resistance
          particle.velocity[1] - 15 * delta, // Gravity
          particle.velocity[2] * 0.98  // Air resistance
        ]

        return {
          ...particle,
          position: newPosition,
          velocity: newVelocity,
          life: newLife
        }
      }).filter(Boolean) as ExplosionParticle[]

      // If no particles left, call onComplete
      if (updatedParticles.length === 0) {
        onComplete()
      }

      return updatedParticles
    })
  })

  return (
    <group ref={groupRef}>
      {particles.map(particle => {
        const opacity = particle.life / particle.maxLife
        const scale = particle.scale * (1 + (1 - opacity) * 2) // Particles grow as they fade
        
        return (
          <mesh 
            key={particle.id}
            position={particle.position}
            scale={[scale, scale, scale]}
          >
            <sphereGeometry args={[0.2, 8, 6]} />
            <meshStandardMaterial 
              color="#ffff00"
              emissive="#ffaa00"
              // eslint-disable-next-line react/no-unknown-property
              emissiveIntensity={0.8 * opacity}
              transparent
              opacity={opacity}
            />
          </mesh>
        )
      })}
    </group>
  )
}

export default ExplosionEffect