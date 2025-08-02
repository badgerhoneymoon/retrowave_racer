import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Mesh, MeshStandardMaterial, SphereGeometry, Vector3 } from 'three'

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

const PARTICLE_COUNT = 12

function ExplosionEffect({ position, onComplete }: ExplosionEffectProps) {
  const groupRef = useRef<Group>(null)
  const particleDataRef = useRef<ExplosionParticle[]>([])
  const meshesRef = useRef<Mesh[]>([])
  const elapsedRef = useRef(0)

  // Initialise particles once
  useEffect(() => {
    const particles: ExplosionParticle[] = []
    const meshes: Mesh[] = []

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

      // Build mesh once
      const geo = new SphereGeometry(0.2, 8, 6)
      const mat = new MeshStandardMaterial({
        color: '#ffff00',
        emissive: '#ffaa00',
        transparent: true,
        opacity: 1
      })
      const mesh = new Mesh(geo, mat)
      mesh.position.set(position[0], position[1], position[2])
      groupRef.current?.add(mesh)
      meshes.push(mesh)
    }

    particleDataRef.current = particles
    meshesRef.current = meshes
  }, [position])

  useFrame((_state, delta) => {
    elapsedRef.current += delta

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
        ;(meshesRef.current[idx].material as MeshStandardMaterial).opacity = opacity
        ;(meshesRef.current[idx].material as MeshStandardMaterial).emissiveIntensity = 0.8 * opacity
      }
    })

    // Auto-complete after 0.6s (slightly longer than particle life)
    if (elapsedRef.current > 0.6) {
      onComplete()
    }
  })

  return <group ref={groupRef} />
}

export default ExplosionEffect