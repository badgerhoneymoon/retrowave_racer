import { Canvas } from '@react-three/fiber'
import { lazy, Suspense, useEffect } from 'react'
import { initAutoStartOnUserGesture } from './utils/audio'
import Scene from './components/Scene'
import HUD from './components/HUD'
import ControlHints from './components/ControlHints'
import './hud.css'
const ProofApp = lazy(() => import('./proof/ProofApp'))

function App() {
  useEffect(() => {
    // Register a one-time user-gesture handler to start audio, not tied to movement keys
    initAutoStartOnUserGesture({ targetVolume: 0.4, durationMs: 800 })
  }, [])
  if (new URLSearchParams(window.location.search).has('proof')) {
    return <Suspense fallback={<div style={{ color: 'white', padding: 32 }}>Preparing the material proof…</div>}><ProofApp /></Suspense>
  }
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 75 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMappingExposure: 1.05 }}
        shadows
      >
        <color attach="background" args={['#070213']} />
        <Scene />
      </Canvas>

      {/* CRT scanlines + vignette (pointer-events: none) */}
      <div className="crt-overlay" />
      <div className="vignette-overlay" />

      <HUD />
      <ControlHints />

      {/* Live FPS readout (updated from inside the Canvas via direct DOM) */}
      <div
        id="fps-meter"
        style={{
          position: 'fixed',
          left: 12,
          bottom: 12,
          zIndex: 30,
          pointerEvents: 'none',
          fontFamily: "'Courier New', monospace",
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 1,
          color: '#00f0ff',
          textShadow: '0 0 6px rgba(0, 240, 255, 0.8)',
          opacity: 0.85,
        }}
      />
    </div>
  )
}

export default App
