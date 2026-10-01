import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector2 } from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'

// Real bloom for the neon world — three's built-in passes, no extra deps.
// RenderPass (linear HDR) → UnrealBloomPass → OutputPass (ACES + sRGB).
// The priority-1 useFrame takes over the render loop from R3F.
function Bloom() {
  const { gl, scene, camera, size, viewport } = useThree()

  const composer = useMemo(() => {
    const effectComposer = new EffectComposer(gl)
    effectComposer.addPass(new RenderPass(scene, camera))
    // Half-res bloom chain: only genuinely hot sources bloom
    // (emissives >1, the sun, exhausts) — the sky and lane paint stay crisp.
    effectComposer.addPass(
      new UnrealBloomPass(
        new Vector2(Math.max(1, size.width / 2), Math.max(1, size.height / 2)),
        0.5,
        0.4,
        0.85
      )
    )
    effectComposer.addPass(new OutputPass())
    return effectComposer
    // scene/camera are stable singletons for the session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl])

  // Keep the chain sized to the viewport
  useEffect(() => {
    composer.setPixelRatio(viewport.dpr)
    composer.setSize(size.width, size.height)
  }, [composer, size, viewport.dpr])

  // Release GPU resources (scene lifetime — but stay hygienic)
  useEffect(() => {
    return () => composer.dispose()
  }, [composer])

  useFrame(() => {
    composer.render()
  }, 1)

  return null
}

export default Bloom
