import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'

// Writes a rolling FPS reading straight into a DOM node outside the Canvas
// (same pattern as the HUD's data-hud contract — zero React re-renders).
function FpsProbe() {
  const acc = useRef({ frames: 0, time: 0 })
  const profile = new URLSearchParams(window.location.search).has('profile')
  const stats = useRef({ start: 0, previous: 0, cpuStart: 0, done: false, frames: [] as number[], cpu: [] as number[], calls: [] as number[], triangles: [] as number[] })
  useEffect(() => {
    if (!profile) return
    const el = document.createElement('pre')
    el.id = 'benchmark'
    el.style.cssText = 'position:fixed;bottom:10px;left:110px;z-index:2000;background:#000c;color:#fff;padding:8px;font-size:11px;pointer-events:none'
    document.body.append(el)
    return () => el.remove()
  }, [profile])
  useFrame(({ gl }) => {
    if (!profile) return
    gl.info.autoReset = false
    gl.info.reset()
    stats.current.cpuStart = performance.now()
  }, -100)
  useFrame(({ gl }) => {
    if (!profile || stats.current.done) return
    const s = stats.current, now = performance.now()
    if (!s.start) s.start = now
    const elapsed = now - s.start
    if (elapsed > 5000 && elapsed < 25000 && s.previous) {
      s.frames.push(now - s.previous)
      s.cpu.push(now - s.cpuStart)
      s.calls.push(gl.info.render.calls)
      s.triangles.push(gl.info.render.triangles)
    }
    s.previous = now
    const mean = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length)
    const el = document.getElementById('benchmark')
    if (el && (elapsed > 25000 || s.frames.length % 60 === 0)) {
      const sorted = [...s.frames].sort((a,b) => a-b)
      const percentile = (p: number) => sorted[Math.floor((sorted.length - 1)*p)] ?? 0
      el.textContent = JSON.stringify({status: elapsed > 25000 ? 'complete' : 'sampling',samples: s.frames.length,medianMs:+percentile(0.5).toFixed(2),p95Ms:+percentile(0.95).toFixed(2),p99Ms:+percentile(0.99).toFixed(2),meanCpuSubmissionMs:+mean(s.cpu).toFixed(2),meanCalls:+mean(s.calls).toFixed(1),meanTriangles:Math.round(mean(s.triangles))})
      if (elapsed > 25000) s.done = true
    }
  }, 2)

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
