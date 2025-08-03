import { useMemo, useRef } from 'react'
import { CanvasTexture, Group, NearestFilter } from 'three'
import { useFrame } from '@react-three/fiber'

function createSunTexture() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Create vertical gradient (top → bottom)
  const gradient = ctx.createLinearGradient(0, 0, 0, size)
  gradient.addColorStop(0, '#ffe92d') // bright yellow
  gradient.addColorStop(0.4, '#ff8a00') // orange
  gradient.addColorStop(1, '#ff0080') // magenta / pink
  ctx.fillStyle = gradient

  // Draw the circular sun
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.closePath()
  ctx.fill()

  // Cut out horizontal stripes for the retro look
  ctx.globalCompositeOperation = 'destination-out'
  const stripeCount = 7
  const stripeHeight = size * 0.05
  const startY = size * 0.25
  const gap = stripeHeight * 1.5
  for (let i = 0; i < stripeCount; i++) {
    const y = startY + i * gap
    ctx.fillRect(0, y, size, stripeHeight)
  }
  ctx.globalCompositeOperation = 'source-over'

  const texture = new CanvasTexture(canvas)
  texture.needsUpdate = true
  texture.magFilter = NearestFilter // crisp stripes
  return texture
}

interface RetrowaveSunProps {
  carZ?: number
}

function RetrowaveSun({ carZ = 0 }: RetrowaveSunProps) {
  const sunRef = useRef<Group>(null)
  const texture = useMemo(createSunTexture, [])

  // Keep the sun a fixed distance ahead of the car (like the road) for smooth movement
  useFrame(() => {
    if (!sunRef.current) return
    
    // Position sun far ahead on the horizon, following car smoothly
    const targetZ = carZ - 120  // Always 120 units ahead of car
    const targetX = 0  // Always centered
    const targetY = 8  // Lower on horizon
    
    // Gentle interpolation to prevent any jerkiness (same as camera)
    const sunLerpFactor = 0.1
    sunRef.current.position.x += (targetX - sunRef.current.position.x) * sunLerpFactor
    sunRef.current.position.y += (targetY - sunRef.current.position.y) * sunLerpFactor
    sunRef.current.position.z += (targetZ - sunRef.current.position.z) * sunLerpFactor
  })

  return (
    <group ref={sunRef}>
      <mesh>
        <circleGeometry args={[20, 64]} />
        {/* eslint-disable-next-line react/no-unknown-property */}
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
    </group>
  )
}

export default RetrowaveSun
