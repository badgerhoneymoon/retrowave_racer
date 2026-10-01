import { useRef, useEffect, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import { geometryCache } from '../utils/geometryCache'
import { triggerFlash } from './FlashLights'

interface ExplosionParticle {
  velocity: Vector3
  life: number
  maxLife: number
  scale: number
}

interface ExplosionEffectProps {
  position: [number, number, number]
  onComplete: () => void
}

const PARTICLE_COUNT = 14
const HOT = new Color('#fff3d0')
const MID = new Color('#ff7a1a')
const COOL = new Color('#ff2d78')

function ExplosionEffect({ position, onComplete }: ExplosionEffectProps) {
  const groupRef = useRef<Group>(null)
  const flashRef = useRef<Mesh>(null)
  const ringRef = useRef<Mesh>(null)
  const particleDataRef = useRef<ExplosionParticle[]>([])
  const meshesRef = useRef<Mesh[]>([])
  const elapsedRef = useRef(0)

  // Impact light burst — borrowed from the persistent FlashLights pool so the
  // scene light count never changes (no shader recompiles mid-game)
  useEffect(() => {
    triggerFlash(position[0], position[1] + 1.5, position[2], '#ffcf7a', 70, 0.45)
  }, [position])

  // Initialise particles once
  useEffect(() => {
    const particles: ExplosionParticle[] = []
    const meshes: Mesh[] = []
    // Shared cached geometry — zero per-explosion GPU uploads
    const particleGeo = geometryCache.getGeometry('explosion-particle')

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2
      const speed = 8 + Math.random() * 4
      const upwardSpeed = 6 + Math.random() * 8

      const velocity = new Vector3(
        Math.cos(angle) * speed,
        upwardSpeed,
        Math.sin(angle) * speed
      )

      particles.push({
        velocity,
        life: 1.0,
        maxLife: 1.0,
        scale: 0.3 + Math.random() * 0.4
      })

      // Per-particle material (each fades independently) — disposed in cleanup below
      const mat = new MeshBasicMaterial({
        color: '#ffb300',
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      })
      const mesh = new Mesh(particleGeo, mat)
      mesh.position.set(position[0], position[1], position[2])
      groupRef.current?.add(mesh)
      meshes.push(mesh)
    }

    particleDataRef.current = particles
    meshesRef.current = meshes

    // Release GPU resources: detach meshes and dispose their materials
    return () => {
      meshes.forEach(mesh => {
        mesh.removeFromParent()
        ;(mesh.material as MeshBasicMaterial).dispose()
      })
      meshesRef.current = []
      particleDataRef.current = []
    }
  }, [position])

  useFrame((_state, delta) => {
    elapsedRef.current += delta
    const t = elapsedRef.current

    // Flash burst — pops, then dies fast
    if (flashRef.current) {
      const flashT = Math.min(1, t / 0.18)
      flashRef.current.scale.setScalar(0.5 + flashT * 3.2)
      const mat = flashRef.current.material as MeshBasicMaterial
      mat.opacity = Math.max(0, 0.9 * (1 - flashT))
    }

    // Expanding shock ring along the ground
    if (ringRef.current) {
      const ringT = Math.min(1, t / 0.5)
      ringRef.current.scale.setScalar(0.4 + ringT * 6)
      const mat = ringRef.current.material as MeshBasicMaterial
      mat.opacity = Math.max(0, 0.7 * (1 - ringT))
    }

    particleDataRef.current.forEach((p, idx) => {
      if (p.life <= 0) return

      // Update life
      p.life -= delta * 2.0 // 0.5s total
      if (p.life <= 0) {
        // Hide mesh
        meshesRef.current[idx].visible = false
        return
      }

      // Update position
      meshesRef.current[idx].position.addScaledVector(p.velocity, delta)
      // Apply gravity & drag
      p.velocity.multiplyScalar(0.98)
      p.velocity.y -= 15 * delta

      // Scale & fade (optimized: only update materials every few frames)
      const opacity = p.life / p.maxLife
      meshesRef.current[idx].scale.setScalar(p.scale * (1 + (1 - opacity) * 2))

      // Reduce frequency of expensive material property updates
      if (elapsedRef.current % 0.05 < delta) { // Update ~20fps instead of 60fps
        const mat = meshesRef.current[idx].material as MeshBasicMaterial
        mat.opacity = opacity
        // white-hot → ember → magenta as the ember dies
        if (opacity > 0.66) {
          mat.color.copy(HOT).lerp(MID, (1 - opacity) * 3)
        } else {
          mat.color.copy(MID).lerp(COOL, 1 - opacity / 0.66)
        }
      }
    })

    // Auto-complete after 0.6s (slightly longer than particle life)
    if (elapsedRef.current > 0.6) {
      onComplete()
    }
  })

  return (
    <group ref={groupRef}>
      {/* Initial white-hot flash */}
      <mesh ref={flashRef} position={position}>
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
      {/* Ground shock ring */}
      <mesh ref={ringRef} position={[position[0], 0.15, position[2]]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.85, 1, 40]} />
        <meshBasicMaterial
          color="#ffb300"
          transparent
          opacity={0.7}
          blending={AdditiveBlending}
          depthWrite={false}
          side={2}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

export default memo(ExplosionEffect)
