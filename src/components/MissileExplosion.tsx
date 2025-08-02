import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface MissileExplosionProps {
  position: [number, number, number]
  onComplete: () => void
}

function MissileExplosion({ position, onComplete }: MissileExplosionProps) {
  const explosionRef = useRef<Group>(null)
  const timeRef = useRef(0)
  const particlesRef = useRef<Group[]>([])
  const shockwaveRef = useRef<Group>(null)
  
  useEffect(() => {
    // Create particle references
    particlesRef.current = []
  }, [])

  useFrame((_, delta) => {
    timeRef.current += delta
    const progress = timeRef.current / 2.0 // 2 second explosion duration
    
    if (progress >= 1.0) {
      onComplete()
      return
    }

    if (!explosionRef.current) return

    // Animate main explosion sphere - even larger and more visible
    const explosionScale = Math.sin(progress * Math.PI) * 12 // Much larger explosion radius
    explosionRef.current.scale.setScalar(explosionScale)
    
    // Animate shockwave
    if (shockwaveRef.current) {
      const shockwaveScale = progress * 12 // Even larger shockwave
      const shockwaveOpacity = 1 - progress
      shockwaveRef.current.scale.setScalar(shockwaveScale)
      
      // Update shockwave material opacity
      const shockwaveMaterial = (shockwaveRef.current.children[0] as any)?.material
      if (shockwaveMaterial) {
        shockwaveMaterial.opacity = shockwaveOpacity * 0.4
      }
    }

    // Animate particles
    particlesRef.current.forEach((particle, index) => {
      if (!particle) return
      
      const particleProgress = Math.min(1, (progress * 1.5) - (index * 0.1))
      if (particleProgress <= 0) return
      
      // Move particles outward
      const angle = (index / particlesRef.current.length) * Math.PI * 2
      const distance = particleProgress * 6
      
      particle.position.set(
        Math.cos(angle) * distance,
        Math.sin(particleProgress * Math.PI) * 3,
        Math.sin(angle) * distance
      )
      
      // Fade out particles
      const particleMaterial = (particle.children[0] as any)?.material
      if (particleMaterial) {
        particleMaterial.opacity = 1 - particleProgress
      }
    })
  })

  return (
    <group position={position} frustumCulled={false}>
      {/* Main explosion sphere */}
      <group ref={explosionRef} frustumCulled={false}>
        <mesh frustumCulled={false}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshStandardMaterial 
            color="#ff4400" 
            emissive="#ff4400" 
            emissiveIntensity={2}
            transparent
            opacity={0.8}
          />
        </mesh>
      </group>
      
      {/* Shockwave ring */}
      <group ref={shockwaveRef}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1.2, 32]} />
          <meshStandardMaterial 
            color="#00ffff" 
            emissive="#00ffff" 
            emissiveIntensity={1}
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
      
      {/* Secondary explosion core */}
      <mesh>
        <sphereGeometry args={[0.5, 12, 12]} />
        <meshStandardMaterial 
          color="#ffff00" 
          emissive="#ffff00" 
          emissiveIntensity={3}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Explosion particles */}
      {Array.from({ length: 12 }, (_, i) => (
        <group 
          key={i} 
          ref={(ref) => {
            if (ref) particlesRef.current[i] = ref
          }}
        >
          <mesh>
            <sphereGeometry args={[0.2, 6, 6]} />
            <meshStandardMaterial 
              color="#ff6600" 
              emissive="#ff6600" 
              emissiveIntensity={1.5}
              transparent
              opacity={0.7}
            />
          </mesh>
        </group>
      ))}
      

    </group>
  )
}

export default MissileExplosion