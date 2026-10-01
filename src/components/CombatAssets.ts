import { CanvasTexture, BufferGeometry, CylinderGeometry, ExtrudeGeometry, Matrix4, MeshBasicMaterial, MeshPhysicalMaterial, Quaternion, Euler, Shape } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// One authored procedural arsenal, shared by the car, flying rounds and pickups.
// Parts are merged by material so detail does not mean one draw per rivet.
export const combatMaterials = {
  armor: new MeshPhysicalMaterial({ color: '#0c1523', metalness: .72, roughness: .36, clearcoat: .6, clearcoatRoughness: .25 }),
  edge: new MeshPhysicalMaterial({ color: '#6e8396', metalness: .85, roughness: .29, clearcoat: .35 }),
  ceramic: new MeshPhysicalMaterial({ color: '#070e19', metalness: .25, roughness: .43, clearcoat: .7 }),
  cyan: new MeshBasicMaterial({ color: '#42dcff', toneMapped: false }),
  amber: new MeshBasicMaterial({ color: '#ffb951', toneMapped: false }),
}
type Role = keyof typeof combatMaterials
type Part = { geo: BufferGeometry; role: Role; position?: [number,number,number]; rotation?: [number,number,number] }
export type CombatBatch = { geometry: BufferGeometry; material: typeof combatMaterials[Role] }
const block = (w:number,h:number,d:number) => {
  const s=new Shape();s.moveTo(-w/2,-h/2);s.lineTo(w/2,-h/2);s.lineTo(w/2,h/2);s.lineTo(-w/2,h/2);s.closePath()
  const b=Math.min(w,h,d)*.12
  const g=new ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:b,bevelThickness:b});g.translate(0,0,-d/2);return g
}
function batch(parts:Part[]):CombatBatch[] {
  return (Object.keys(combatMaterials) as Role[]).flatMap(role=>{
    const gs=parts.filter(p=>p.role===role).map(p=>{
      const m=new Matrix4().makeRotationFromQuaternion(new Quaternion().setFromEuler(new Euler(...(p.rotation??[0,0,0]))));m.setPosition(...(p.position??[0,0,0]));p.geo.applyMatrix4(m)
      const g=p.geo.index?p.geo.toNonIndexed():p.geo;g.deleteAttribute('uv');return g
    })
    if(!gs.length)return []
    const geometry=mergeGeometries(gs,false)!;gs.forEach(g=>g.dispose());return [{geometry,material:combatMaterials[role]}]
  })
}

const cannon:Part[]=[{geo:new CylinderGeometry(.54,.58,.09,24),role:'armor',position:[0,.69,.10]}, {geo:block(.35,.13,.42),role:'ceramic',position:[0,.79,.13]}]
for(const x of [-.27,.27]) {
  cannon.push({geo:new CylinderGeometry(.095,.15,1.35,8),role:'armor',position:[x,.81,-.45],rotation:[Math.PI/2,0,0]}, {geo:new CylinderGeometry(.083,.083,.18,16,1,true),role:'edge',position:[x,.81,-1.17],rotation:[Math.PI/2,0,0]}, {geo:new CylinderGeometry(.054,.054,.025,12),role:'ceramic',position:[x,.81,-1.23],rotation:[Math.PI/2,0,0]})
  for(let n=0;n<5;n++)cannon.push({geo:new CylinderGeometry(.124,.124,.025,12),role:n%2?'cyan':'edge',position:[x,.81,-.93+n*.17],rotation:[Math.PI/2,0,0]})
  cannon.push({geo:block(.02,.035,.72),role:'cyan',position:[x,.953,-.27]})
}
export const CANNON_BATCHES=batch(cannon)
const bay:Part[]=[{geo:block(.80,.075,.41),role:'armor',position:[0,.71,.64]}]
for(const x of [-.24,0,.24]) {
  bay.push({geo:new CylinderGeometry(.095,.115,.30,8,1,true),role:'edge',position:[x,.85,.61],rotation:[-.58,0,0]}, {geo:new CylinderGeometry(.071,.071,.025,8),role:'ceramic',position:[x,.962,.537],rotation:[-.58,0,0]}, {geo:new CylinderGeometry(.044,.044,.02,8),role:'amber',position:[x,.975,.527],rotation:[-.58,0,0]})
}
export const BAY_BATCHES=batch(bay)

// Local +Y is the nose, matching the existing ballistic orientation.
const missile:Part[]=[{geo:new CylinderGeometry(.12,.18,1.18,8),role:'armor',position:[0,-.05,0]}, {geo:new CylinderGeometry(.022,.12,.44,8),role:'ceramic',position:[0,.75,0]}, {geo:new CylinderGeometry(.135,.135,.065,16),role:'edge',position:[0,.43,0]}, {geo:new CylinderGeometry(.19,.19,.10,16),role:'edge',position:[0,-.55,0]}, {geo:new CylinderGeometry(.135,.135,.12,12,1,true),role:'ceramic',position:[0,-.72,0]}, {geo:new CylinderGeometry(.095,.095,.028,12),role:'amber',position:[0,-.78,0]}]
for(let n=0;n<4;n++) {
  const a=n*Math.PI/2
  missile.push({geo:block(.065,.68,.025),role:'amber',position:[Math.sin(a)*.17,-.09,Math.cos(a)*.17],rotation:[0,a,0]}, {geo:block(.055,.42,.37),role:'armor',position:[Math.sin(a)*.20,-.45,Math.cos(a)*.20],rotation:[0,a,0]})
}
export const MISSILE_BATCHES=batch(missile)

// Open cradles and cartridge racks replace the old wireframe cubes.
const cradle:Part[]=[{geo:block(1.28,.18,1.10),role:'armor',position:[0,-.48,0]}, {geo:block(1.05,.08,.90),role:'ceramic',position:[0,-.34,0]}]
for(const x of [-.55,.55]) {
  cradle.push({geo:block(.13,.65,1.06),role:'edge',position:[x,-.12,0]}, {geo:block(.035,.025,.90),role:'amber',position:[x,.23,0]})
}
export const CRADLE_BATCHES=batch(cradle)

const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64
const glowContext=glowCanvas.getContext('2d')!
const glowGradient=glowContext.createRadialGradient(32,32,0,32,32,32)
glowGradient.addColorStop(0,'rgba(255,255,255,1)');glowGradient.addColorStop(.3,'rgba(255,255,255,.8)');glowGradient.addColorStop(1,'rgba(255,255,255,0)')
glowContext.fillStyle=glowGradient;glowContext.fillRect(0,0,64,64)
export const COMBAT_GLOW=new CanvasTexture(glowCanvas)
