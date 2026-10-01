import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BufferAttribute, Mesh, MeshPhysicalMaterial, PlaneGeometry, RepeatWrapping, ShaderChunk, SRGBColorSpace, Vector2 } from 'three'
import { ROAD_HALF_WIDTH, roadCenterAt } from '../utils/roadCurve'

export default memo(function PhysicalRoad({ carZ = 0, wet = false }: { carZ?: number; wet?: boolean }) {
  const mesh = useRef<Mesh>(null), lastAnchor = useRef(NaN)
  const source = useTexture(['/textures/road007/Road007_1K-JPG_Color.jpg', '/textures/road007/Road007_1K-JPG_NormalGL.jpg', '/textures/road007/Road007_1K-JPG_Roughness.jpg'])
  const maps = useMemo(() => source.map((s, i) => {
    const map = s.clone(); map.wrapS = map.wrapT = RepeatWrapping; map.anisotropy = 8
    if (i === 0) map.colorSpace = SRGBColorSpace
    map.needsUpdate = true; return map
  }), [source])
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(ROAD_HALF_WIDTH * 2, 540, 1, 180).rotateX(-Math.PI / 2)
    // Rows are authored from +Z to -Z below, reversing PlaneGeometry's
    // default winding. Keep the asphalt front faces and normals facing up.
    const indices = g.index!
    for (let i = 0; i < indices.count; i += 3) {
      const second = indices.getX(i + 1)
      indices.setX(i + 1, indices.getX(i + 2))
      indices.setX(i + 2, second)
    }
    g.setAttribute('roadCoord', new BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2))
    return g
  }, [])
  const material = useMemo(() => {
    const mat = new MeshPhysicalMaterial({ map: maps[0], normalMap: maps[1], roughnessMap: maps[2], color: '#b5b8c2', roughness: wet ? 0.58 : 0.96, metalness: 0, normalScale: new Vector2(0.5, 0.5), clearcoat: wet ? 0.65 : 0.04, clearcoatRoughness: wet ? 0.13 : 0.5 })
    mat.onBeforeCompile = shader => {
      shader.vertexShader = 'attribute vec2 roadCoord; varying vec2 vRoadCoords;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', '#include <uv_vertex>\nvRoadCoords = roadCoord;')
      shader.fragmentShader = 'varying vec2 vRoadCoords;\nvec2 asphaltUv(vec2 p) { return vec2(0.25 + 0.18 * fract(p.x), p.y); }\n' + shader.fragmentShader
      // Sample the asphalt between Road007's authored paint lines for all
      // three maps. Lane positions remain the game's existing ±3/±9 metres.
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', ShaderChunk.map_fragment.replace('vMapUv )', 'asphaltUv(vMapUv) )') + `
        float lateral = abs(vRoadCoords.x);
        float divider = 1.0 - smoothstep(0.07, 0.15, min(abs(lateral-3.0), abs(lateral-9.0)));
        float dash = 1.0 - smoothstep(3.8, 4.0, mod(vRoadCoords.y, 8.0));
        float edge = 1.0 - smoothstep(0.06, 0.13, abs(lateral-17.8));
        float marking = max(divider*dash, edge);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.56,0.64,0.70), marking);
      `)
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', ShaderChunk.roughnessmap_fragment.replace('vRoughnessMapUv )', 'asphaltUv(vRoughnessMapUv) )') + '\nroughnessFactor = mix(roughnessFactor, 0.52, marking);')
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', ShaderChunk.normal_fragment_maps.split('vNormalMapUv )').join('asphaltUv(vNormalMapUv) )'))
    }
    mat.customProgramCacheKey = () => 'physical-asphalt-v1'
    return mat
  }, [maps, wet])
  useEffect(() => () => material.dispose(), [material])
  useEffect(() => () => { geometry.dispose(); maps.forEach(t => t.dispose()) }, [geometry, maps])
  useFrame(() => {
    const anchor = Math.floor(carZ / 15) * 15
    if (anchor === lastAnchor.current || !mesh.current) return
    const position = geometry.attributes.position, uv = geometry.attributes.uv, coords = geometry.attributes.roadCoord
    for (let i = 0; i < position.count; i++) {
      const localX = i % 2 === 0 ? -ROAD_HALF_WIDTH : ROAD_HALF_WIDTH
      const localZ = 60 - Math.floor(i / 2) * 3
      const z = localZ + anchor, phase = ((anchor % 3600) + 3600) % 3600 + localZ + 3600
      position.setXYZ(i, localX + roadCenterAt(z), -0.5, localZ)
      uv.setXY(i, localX / 1.35, phase / 7.5)
      coords.setXY(i, localX, phase)
    }
    position.needsUpdate = uv.needsUpdate = coords.needsUpdate = true
    geometry.computeVertexNormals(); geometry.computeBoundingSphere()
    mesh.current.position.z = anchor; lastAnchor.current = anchor
  })
  return <>
    <mesh ref={mesh} geometry={geometry} material={material} receiveShadow />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, carZ - 210]} receiveShadow>
      <planeGeometry args={[360, 540]} /><meshStandardMaterial color="#27242e" roughness={0.98} />
    </mesh>
  </>
})
