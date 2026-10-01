import { useRef, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, Mesh, MeshBasicMaterial } from 'three'
import { triggerFlash } from './FlashLights'

interface MissileExplosionProps {
  position: [number, number, number]
  onComplete: () => void
}

function MissileExplosion({ position, onComplete }: MissileExplosionProps) {
  const explosionRef = useRef<Group>(null)
  const coreRef = useRef<Mesh>(null)
  const timeRef = useRef(0)
  const particlesRef = useRef<Group[]>([])
  const shockwaveRef = useRef<Group>(null)
  const frameCountRef = useRef(0)

  // Blast illumination — borrowed from the persistent FlashLights pool so the
  // scene light count never changes (no shader recompiles mid-game)
  useEffect(() => {
    triggerFlash(position[0], position[1] + 2, position[2], '#ffb05c', 140, 1.0)
  }, [position])

  useFrame((_, delta) => {
    timeRef.current += delta
    frameCountRef.current += 1
    const progress = timeRef.current / 2.0 // 2 second explosion duration

    if (progress >= 1.0) {
      onComplete()
      return
    }

    // Animate main explosion fireball — grows then deflates (radius peaks ~12)
    if (explosionRef.current) {
      const explosionScale = Math.sin(progress * Math.PI) * 12
      explosionRef.current.scale.setScalar(Math.max(0.001, explosionScale))

      // Fade the shell over the second half
      const shell = explosionRef.current.children[0] as Mesh
      if (shell && frameCountRef.current % 3 === 0) {
        ;(shell.material as MeshBasicMaterial).opacity = 0.5 * (1 - progress * 0.7)
      }
    }

    // White-hot core burns out faster than the shell
    if (coreRef.current) {
      const coreT = Math.min(1, progress * 1.6)
      coreRef.current.scale.setScalar(Math.max(0.001, Math.sin(coreT * Math.PI) * 5))
      if (frameCountRef.current % 3 === 0) {
        ;(coreRef.current.material as MeshBasicMaterial).opacity = 0.9 * (1 - coreT)
      }
    }

    // Animate shockwave — ground ring racing outward
    if (shockwaveRef.current) {
      const shockwaveScale = 0.5 + progress * 14
      shockwaveRef.current.scale.setScalar(shockwaveScale)

      const shockwaveMaterial = (shockwaveRef.current.children[0] as any)?.material
      if (shockwaveMaterial && frameCountRef.current % 2 === 0) {
        shockwaveMaterial.opacity = Math.max(0, (1 - progress) * 0.55)
      }
    }

    // Animate ember particles (optimized: batch material updates)
    particlesRef.current.forEach((particle, index) => {
      if (!particle) return

      const particleProgress = Math.min(1, (progress * 1.5) - (index * 0.08))
      if (particleProgress <= 0) return

      // Move particles outward on a spread cone
      const angle = (index / particlesRef.current.length) * Math.PI * 2
      const distance = particleProgress * 8

      particle.position.set(
        Math.cos(angle) * distance,
        Math.sin(particleProgress * Math.PI) * 4,
        Math.sin(angle) * distance
      )

      // Optimize: Only update material opacity every few frames to reduce cost
      if (frameCountRef.current % 3 === 0) {
        const particleMaterial = (particle.children[0] as any)?.material
        if (particleMaterial) {
          particleMaterial.opacity = (1 - particleProgress) * 0.9
        }
      }
    })
  })

  return (
    <group position={position} frustumCulled={false}>
      {/* Main fireball shell */}
      <group ref={explosionRef} frustumCulled={false}>
        <mesh frustumCulled={false}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#ff7a1a"
            transparent
            opacity={0.5}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* White-hot core */}
      <mesh ref={coreRef} frustumCulled={false}>
        <sphereGeometry args={[1, 12, 12]} />
        <meshBasicMaterial
          color="#fff3d0"
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Ground shockwave ring */}
      <group ref={shockwaveRef}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.7, 0]}>
          <ringGeometry args={[0.85, 1, 48]} />
          <meshBasicMaterial
            color="#ffb300"
            transparent
            opacity={0.55}
            blending={AdditiveBlending}
            depthWrite={false}
            side={2}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Ember particles */}
      {Array.from({ length: 12 }, (_, i) => (
        <group
          key={i}
          ref={(ref) => {
            if (ref) particlesRef.current[i] = ref
          }}
        >
          <mesh>
            <sphereGeometry args={[0.25, 6, 6]} />
            <meshBasicMaterial
              color="#ff9a3c"
              transparent
              opacity={0.9}
              blending={AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  )
}

export default memo(MissileExplosion)
