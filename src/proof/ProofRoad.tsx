import { memo, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import { RepeatWrapping, SRGBColorSpace, Vector2 } from 'three'

export default memo(function ProofRoad() {
  const loaded = useTexture([
    '/textures/road007/Road007_1K-JPG_Color.jpg',
    '/textures/road007/Road007_1K-JPG_NormalGL.jpg',
    '/textures/road007/Road007_1K-JPG_Roughness.jpg',
  ])
  const [color, normal, rough] = useMemo(() => loaded.map((source, i) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = RepeatWrapping
    // Road007 is authored at 7.5 metres per tile, not arbitrary repetitions.
    texture.repeat.set(1, 12)
    texture.anisotropy = 8
    if (i === 0) texture.colorSpace = SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }), [loaded])
  const normalScale = useMemo(() => new Vector2(0.65, 0.65), [])
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.008, -25]} receiveShadow>
      <planeGeometry args={[7.5, 90]} />
      <meshPhysicalMaterial color="#c3c4c7" map={color} normalMap={normal} normalScale={normalScale} roughnessMap={rough} roughness={0.9} metalness={0} clearcoat={0.25} clearcoatRoughness={0.36} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, 0]} receiveShadow>
      <planeGeometry args={[180, 180]} />
      <meshStandardMaterial color="#222733" roughness={0.95} />
    </mesh>
  </>
})
