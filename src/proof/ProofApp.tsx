import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { AgXToneMapping, PCFSoftShadowMap } from 'three'
import ProofScene from './ProofScene'

export default function ProofApp() {
  const params = new URLSearchParams(window.location.search)
  const before = params.has('before')
  const camera: [number, number, number] = params.has('rear') ? [5.9, 2.1, 6.8] : [5.9, 2.1, -6.8]
  return <div style={{ width: '100vw', height: '100vh', background: '#10141c', color: '#eff2f5', fontFamily: 'system-ui' }}>
    <Canvas camera={{ position: camera, fov: 40, near: 0.1, far: 200 }} dpr={1.5} shadows gl={{ antialias: true }} onCreated={({ gl }) => {
      gl.toneMapping = AgXToneMapping
      gl.toneMappingExposure = 0.9
      gl.shadowMap.type = PCFSoftShadowMap
    }}>
      <Suspense fallback={null}><ProofScene before={before} /></Suspense>
    </Canvas>
    {!params.has('capture') && <div style={{ position: 'absolute', top: 28, left: 32, maxWidth: 540, textShadow: '0 2px 10px #000' }}>
      <div style={{ fontSize: 11, letterSpacing: 3, opacity: 0.7 }}>NEON OVERDRIVE / MATERIAL STUDY 01</div>
      <h1 style={{ fontSize: 27, margin: '10px 0' }}>{before ? 'Current game asset' : 'Authored asset · physical surfaces'}</h1>
      <div style={{ fontSize: 13, lineHeight: 1.6, opacity: 0.8 }}>Drag to orbit. Compare the same camera and staging.<br />Local proof; the racing game and controls remain available.</div>
      <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
        <a style={{ color: 'white' }} href={'?proof' + (params.has('rear') ? '&rear' : '')}>New proof</a>
        <a style={{ color: 'white' }} href={'?proof&before' + (params.has('rear') ? '&rear' : '')}>Current asset</a>
        <a style={{ color: 'white' }} href={'?proof' + (before ? '&before' : '') + (params.has('rear') ? '' : '&rear')}>Other angle</a>
        <a style={{ color: 'white' }} href="/">Play game</a>
      </div>
    </div>}
    {!params.has('capture') && <div style={{ position: 'absolute', bottom: 20, left: 32, fontSize: 10, opacity: 0.65 }}>
      Car Concept © 2024 Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0 · Road007: ambientCG, CC0 · Venice Sunset: Poly Haven, CC0
    </div>}
  </div>
}
