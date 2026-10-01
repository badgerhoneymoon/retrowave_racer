import { memo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, useTexture } from '@react-three/drei'
import { Mesh, RepeatWrapping } from 'three'

interface WetRoadProps {
  carZ?: number
}

// A semi-transparent reflective film floating just above the neon road.
// The procedural road stays untouched underneath; this adds planar
// reflections (sky, sun, car, neon) for the wet-mirror street look.
// Toggle at runtime with the T key (A/B for frame rate).
function WetRoad({ carZ = 0 }: WetRoadProps) {
  const meshRef = useRef<Mesh>(null)

  const normalMap = useTexture('/textures/road007/Road007_1K-JPG_NormalGL.jpg')
  const roughnessMap = useTexture('/textures/road007/Road007_1K-JPG_Roughness.jpg')
  for (const tex of [normalMap, roughnessMap]) {
    tex.wrapS = RepeatWrapping
    tex.wrapT = RepeatWrapping
    tex.repeat.set(24, 100)
    tex.needsUpdate = true
  }

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.z = carZ
    }
  })

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.46, 0]}
    >
      <planeGeometry args={[240, 1000]} />
      <MeshReflectorMaterial
        resolution={256}
        blur={[100, 40]}
        mixBlur={1}
        mixStrength={6}
        color="#05050c"
        metalness={0.4}
        roughness={0.85}
        roughnessMap={roughnessMap}
        normalMap={normalMap}
        normalScale={[0.35, 0.35]}
        transparent
        opacity={0.6}
        depthWrite={false}
      />
    </mesh>
  )
}

export default memo(WetRoad)
