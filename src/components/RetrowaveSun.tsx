import { followMovingTarget, WorldPositionRef } from '../utils/motion'
import { useMemo, useRef } from 'react'
import { CanvasTexture, Group, LinearFilter } from 'three'
import { useFrame } from '@react-three/fiber'
import { roadCenterAt } from '../utils/roadCurve'

function createSunTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Vertical gradient (top → bottom)
  const gradient = ctx.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#fff3a0') // pale hot yellow
  gradient.addColorStop(0.35, '#ffb300') // amber
  gradient.addColorStop(0.65, '#ff5e3a') // ember orange
  gradient.addColorStop(1, '#ff2d78') // hot pink
  ctx.fillStyle = gradient

  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()

  // Cut horizontal stripes — thin at the equator, growing toward the base
  ctx.globalCompositeOperation = 'destination-out'
  let y = size * 0.52
  let stripe = size * 0.012
  while (y < size) {
    ctx.fillRect(0, y, size, stripe)
    y += stripe + size * 0.045
    stripe *= 1.55
  }
  ctx.globalCompositeOperation = 'source-over'

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.magFilter = LinearFilter
  return texture
}

function createHaloTexture() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  )
  gradient.addColorStop(0, 'rgba(255, 120, 90, 0.55)')
  gradient.addColorStop(0.35, 'rgba(255, 45, 120, 0.28)')
  gradient.addColorStop(0.7, 'rgba(160, 40, 160, 0.10)')
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  return texture
}

interface RetrowaveSunProps {
  worldPositionRef: WorldPositionRef
}

function RetrowaveSun({ worldPositionRef }: RetrowaveSunProps) {
  const previousTarget = useRef({ x: roadCenterAt(-140), y: 18, z: -140 })
  const sunRef = useRef<Group>(null)
  const texture = useMemo(createSunTexture, [])
  const haloTexture = useMemo(createHaloTexture, [])

  // Keep the sun a fixed distance ahead of the car (like the road) for smooth movement
  useFrame(({ clock }, delta) => {
    if (!sunRef.current) return

    // Position sun far ahead on the horizon, following car smoothly.
    // It hangs over the road's vanishing point, so it sways with the curves.
    const targetZ = worldPositionRef.current.z - 140 // Always 140 units ahead of car
    const targetX = roadCenterAt(targetZ)
    const targetY = 18 + Math.sin(clock.elapsedTime * 0.4) * 0.4 // Barely-there float

    const previous = previousTarget.current
    sunRef.current.position.x = followMovingTarget(sunRef.current.position.x, previous.x, targetX, delta)
    sunRef.current.position.y = followMovingTarget(sunRef.current.position.y, previous.y, targetY, delta)
    sunRef.current.position.z = followMovingTarget(sunRef.current.position.z, previous.z, targetZ, delta)
    previous.x = targetX; previous.y = targetY; previous.z = targetZ
  })

  return (
    <group ref={sunRef}>
      {/* Glow halo behind the sun */}
      <mesh position={[0, 0, -2]}>
        <planeGeometry args={[80, 80]} />
        <meshBasicMaterial
          map={haloTexture}
          transparent
          depthWrite={false}
          fog={false}
          toneMapped={false}
        />
      </mesh>
      {/* Striped sun disc */}
      <mesh>
        <circleGeometry args={[19, 64]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meshBasicMaterial map={texture} transparent toneMapped={false} fog={false} />
      </mesh>
    </group>
  )
}

export default RetrowaveSun
