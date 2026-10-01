import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PointLight } from 'three'

// ---------------------------------------------------------------------------
// Persistent flash-light pool for explosions/crashes.
//
// Why this exists: mounting or unmounting a light changes the scene's light
// count, which forces three.js to recompile EVERY lit material program
// (car clearcoat, obstacle standards, reflector) — a 100ms+ freeze per event,
// twice per event (mount + unmount). That was the source of the constant
// stutter. These lights stay mounted forever at intensity 0 and effects just
// borrow one, so the shader programs never rebuild after startup.
// ---------------------------------------------------------------------------

const POOL_SIZE = 3

interface FlashSlot {
  t: number
  duration: number
  peak: number
  active: boolean
}

interface FlashRequest {
  x: number
  y: number
  z: number
  color: string
  intensity: number
  duration: number
}

const slots: FlashSlot[] = Array.from({ length: POOL_SIZE }, () => ({
  t: 0,
  duration: 1,
  peak: 0,
  active: false,
}))
const pending: FlashRequest[] = []

// Fire-and-forget: borrow a pooled light at a world position. If the pool is
// exhausted the flash is silently dropped (visual-only feature).
export function triggerFlash(
  x: number,
  y: number,
  z: number,
  color: string,
  intensity: number,
  duration: number
) {
  pending.push({ x, y, z, color, intensity, duration })
}

function FlashLights() {
  const lightsRef = useRef<Array<PointLight | null>>([])

  useFrame((_, delta) => {
    // Assign queued flashes to free slots
    while (pending.length > 0) {
      const freeIndex = slots.findIndex(s => !s.active)
      if (freeIndex === -1) {
        pending.length = 0
        break
      }
      const light = lightsRef.current[freeIndex]
      if (!light) {
        pending.length = 0
        break
      }
      const req = pending.shift()!
      const slot = slots[freeIndex]
      light.position.set(req.x, req.y, req.z)
      light.color.set(req.color)
      slot.t = 0
      slot.duration = req.duration
      slot.peak = req.intensity
      slot.active = true
    }

    // Decay active flashes (quadratic falloff — hot pop, fast die)
    for (let i = 0; i < POOL_SIZE; i++) {
      const slot = slots[i]
      const light = lightsRef.current[i]
      if (!light) continue
      if (!slot.active) {
        if (light.intensity !== 0) light.intensity = 0
        continue
      }
      slot.t += delta
      const k = Math.max(0, 1 - slot.t / slot.duration)
      light.intensity = slot.peak * k * k
      if (k <= 0) {
        slot.active = false
        light.intensity = 0
      }
    }
  })

  return (
    <>
      {Array.from({ length: POOL_SIZE }, (_, i) => (
        <pointLight
          key={i}
          ref={(l) => {
            lightsRef.current[i] = l
          }}
          distance={45}
          decay={2}
          intensity={0}
        />
      ))}
    </>
  )
}

export default memo(FlashLights)
