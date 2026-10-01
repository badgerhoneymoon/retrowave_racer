import { memo, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import CarVisual from '../components/CarVisual'

function ConceptCar() {
  const { scene } = useGLTF('/models/cars/proof-concept.glb')
  const model = useMemo(() => {
    const root = new Group()
    const asset = scene.clone(true)
    root.add(asset)
    const box = new Box3().setFromObject(asset), size = box.getSize(new Vector3()), center = box.getCenter(new Vector3())
    const scale = 4.55 / size.z
    asset.position.set(-center.x, -box.min.y, -center.z)
    root.scale.setScalar(scale)
    root.rotation.y = Math.PI
    asset.traverse(obj => {
      if (!(obj instanceof Mesh)) return
      obj.castShadow = true; obj.receiveShadow = true
      const source = Array.isArray(obj.material) ? obj.material : [obj.material]
      const mats = source.map(m => {
        const mat = m.clone() as MeshStandardMaterial
        // Keep authored normals, occlusion, tread and metal textures.
        if (mat.name === 'Paint 1 Carmine') mat.color.set('#9c163b')
        if (mat.name === 'Tireside' || mat.name === 'Tiretread') { mat.roughness = 0.88; mat.metalness = 0 }
        mat.envMapIntensity = 1.0
        return mat
      })
      obj.material = Array.isArray(obj.material) ? mats : mats[0]
    })
    return root
  }, [scene])
  return <primitive object={model} />
}

export default memo(function ProofCar({ before }: { before: boolean }) {
  // CarModel normalizes the original GLB's wheel bottoms to y=0 too.
  return before ? <CarVisual isColliding={false} spreadShotActive={false} isBoosted={false} /> : <ConceptCar />
})
