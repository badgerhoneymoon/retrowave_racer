import { useMemo } from 'react'
import { CanvasTexture } from 'three'

interface RetrowaveSunProps {
  carZ: number
}

function RetrowaveSun({ carZ }: RetrowaveSunProps) {
  const texture = useMemo(() => {
    const size = 512
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    // Clear canvas to transparent
    ctx.clearRect(0, 0, size, size)

    // Create vertical gradient (top -> bottom)
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

    const tex = new CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  // Position sun slightly above the horizon and well ahead of the car
  return (
    <group position={[0, 10, carZ - 120]}>
      <mesh>
        {/* A higher-segment circle for smooth edges */}
        <circleGeometry args={[12, 64]} />
        <meshBasicMaterial
          // eslint-disable-next-line react/no-unknown-property
          map={texture}
          transparent
          // eslint-disable-next-line react/no-unknown-property
          toneMapped={false} // keep colors vibrant
        />
      </mesh>
    </group>
  )
}

export default RetrowaveSun
