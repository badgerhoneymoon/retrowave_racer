import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

// Writes a rolling FPS reading straight into a DOM node outside the Canvas
// (same pattern as the HUD's data-hud contract — zero React re-renders).
function FpsProbe() {
  const acc = useRef({ frames: 0, time: 0 })

  useFrame((_, delta) => {
    acc.current.frames += 1
    acc.current.time += delta
    if (acc.current.time >= 0.5) {
      const el = document.getElementById('fps-meter')
      if (el) {
        el.textContent = `${Math.round(acc.current.frames / acc.current.time)} FPS`
      }
      acc.current.frames = 0
      acc.current.time = 0
    }
  })

  return null
}

export default FpsProbe
