import { BufferGeometry, CylinderGeometry, Euler, ExtrudeGeometry, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, OctahedronGeometry, Quaternion, Shape, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { combatMaterials } from './CombatAssets'

// Physical housings use the arsenal's armor and machined-edge finishes.
// Detail is merged by material once, never rebuilt for individual pickups.
const materials = {
  armor: combatMaterials.armor,
  edge: combatMaterials.edge,
  amber: combatMaterials.amber,
  gold: new MeshPhysicalMaterial({ color: '#ffd363', metalness: .78, roughness: .25, clearcoat: .55, emissive: '#8c4900', emissiveIntensity: .18 }),
  green: new MeshPhysicalMaterial({ color: '#217f42', metalness: .38, roughness: .3, clearcoat: .65, emissive: '#0b5826', emissiveIntensity: .25 }),
  lime: new MeshBasicMaterial({ color: '#66ff9a', toneMapped: false }),
}
type Role = keyof typeof materials
type Part = { geometry: BufferGeometry; role: Role; position?: [number, number, number]; rotation?: [number, number, number] }
function block(w: number, h: number, d: number) {
  const shape = new Shape(); shape.moveTo(-w/2, -h/2); shape.lineTo(w/2, -h/2); shape.lineTo(w/2, h/2); shape.lineTo(-w/2, h/2); shape.closePath()
  return new ExtrudeGeometry(shape, { depth: d, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: Math.min(w,h,d)*.1, bevelThickness: Math.min(w,h,d)*.1 }).translate(0,0,-d/2)
}
function beam(a: [number,number,number], b: [number,number,number], radius: number) {
  const from=new Vector3(...a),to=new Vector3(...b),direction=to.clone().sub(from)
  const rotation=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),direction.clone().normalize())
  return new CylinderGeometry(radius,radius,direction.length(),6).applyMatrix4(new Matrix4().compose(from.add(to).multiplyScalar(.5),rotation,new Vector3(1,1,1)))
}
function batch(parts: Part[]) {
  return (Object.keys(materials) as Role[]).flatMap(role => {
    const chunks=parts.filter(p=>p.role===role).map(p=>{
      const matrix=new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromEuler(new Euler(...(p.rotation??[0,0,0]))));matrix.setPosition(...(p.position??[0,0,0]));p.geometry.applyMatrix4(matrix)
      const g=p.geometry.index?p.geometry.toNonIndexed():p.geometry;g.deleteAttribute('uv');if(g!==p.geometry)p.geometry.dispose();return g
    })
    if(!chunks.length)return []
    const geometry=mergeGeometries(chunks,false)!;chunks.forEach(g=>g.dispose());return [{geometry,material:materials[role]}]
  })
}

const reward: Part[] = [
  { geometry: new OctahedronGeometry(.42), role: 'gold' },
  { geometry: new CylinderGeometry(.45,.49,.12,8), role: 'armor', position: [0,-.51,0] },
  { geometry: new CylinderGeometry(.42,.42,.06,8), role: 'edge', position: [0,.51,0] },
  { geometry: new CylinderGeometry(.28,.28,.025,8), role: 'amber', position: [0,-.44,0] },
]
for(const x of [-.31,.31])for(const z of [-.31,.31]){
  reward.push({geometry:block(.065,.93,.065),role:'edge',position:[x,0,z]}, {geometry:block(.09,.13,.09),role:'armor',position:[x,.46,z]})
}
export const REWARD_BATCHES = batch(reward)

const boost: Part[] = [
  { geometry: new CylinderGeometry(.47,.52,.12,8), role: 'armor', position: [0,-.43,0] },
  { geometry: new CylinderGeometry(.095,.43,1.28,8), role: 'green', position: [0,.28,0] },
  { geometry: new CylinderGeometry(.015,.095,.22,8), role: 'edge', position: [0,1.03,0] },
  { geometry: new CylinderGeometry(.44,.44,.045,8), role: 'edge', position: [0,-.34,0] },
  { geometry: new CylinderGeometry(.09,.09,.045,8), role: 'lime', position: [0,.93,0] },
]
for(let i=0;i<4;i++){
  const a=i*Math.PI/2,s=Math.sin(a),c=Math.cos(a)
  boost.push({geometry:beam([s*.4,-.29,c*.4],[s*.11,.88,c*.11],.025),role:'lime'})
  boost.push({geometry:block(.15,.08,.15),role:'edge',position:[s*.38,-.41,c*.38]})
}
export const BOOST_BATCHES = batch(boost)
