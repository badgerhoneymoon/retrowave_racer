import { WorldPositionRef } from '../utils/motion'
import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, CylinderGeometry, ExtrudeGeometry, InstancedMesh, Matrix4, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, RepeatWrapping, Shape, SRGBColorSpace, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { roadCenterAt, roadYawAt } from '../utils/roadCurve'
const COUNT=64, PERIOD=960
const random=(n:number)=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x)}
function stoneMap(){
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d')!
 ctx.fillStyle='#a29e95';ctx.fillRect(0,0,256,256)
 for(let i=0;i<14000;i++){const v=100+Math.floor(random(i+2)*90);ctx.fillStyle=`rgba(${v},${v},${v},0.12)`;ctx.fillRect(random(i*3)*256,random(i*5)*256,1,1)}
 ctx.strokeStyle='#78776e';ctx.lineWidth=1
 for(let y=0;y<256;y+=64){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke()}
 const t=new CanvasTexture(c);t.colorSpace=SRGBColorSpace;t.wrapS=t.wrapT=RepeatWrapping;t.repeat.set(.5,.5);t.anisotropy=8;return t
}
function outline(w:number,d:number,cut:number){
 return [[-w/2+cut,-d/2],[w/2-cut,-d/2],[w/2,-d/2+cut],[w/2,d/2-cut],[w/2-cut,d/2],[-w/2+cut,d/2],[-w/2,d/2-cut],[-w/2,-d/2+cut]] as [number,number][]
}
function mass(p:[number,number][],bottom:number,height:number,bevel=.08){
 const s=new Shape();s.moveTo(...p[0]);p.slice(1).forEach(v=>s.lineTo(...v));s.closePath()
 return new ExtrudeGeometry(s,{depth:height,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:1}).rotateX(-Math.PI/2).translate(0,bottom,0)
}
function beam(a:Vector3,b:Vector3,r:number){
 const dir=b.clone().sub(a),q=new Quaternion().setFromUnitVectors(new Vector3(0,1,0),dir.clone().normalize())
 return new CylinderGeometry(r,r,dir.length(),4).applyMatrix4(new Matrix4().compose(a.clone().add(b).multiplyScalar(.5),q,new Vector3(1,1,1)))
}
function build(kind:number){
 const width=11+kind%3*2.5,depth=15+kind%2*3,floors=7+kind*2
 const stone:BufferGeometry[]=[],glass:BufferGeometry[]=[],metal:BufferGeometry[]=[],warm:BufferGeometry[]=[],cool:BufferGeometry[]=[]
 const lower=outline(width+1.4,depth+1.4,1.5),upper=outline(width,depth,1.1)
 stone.push(mass(lower,.05,4.1,.12),mass(upper,4.2,floors*3.15),mass(outline(width+.7,depth+.7,1.1),3.9,.38,.07))
 for(let f=0;f<=floors;f++)stone.push(mass(outline(width+.18,depth+.18,1.1),4.2+f*3.15,.13,.025))
 let roof=4.2+floors*3.15
 for(let t=0;t<2;t++){const shrink=2.4+t*2.3;stone.push(mass(outline(width-shrink,depth-shrink,.8),roof,2));roof+=2.1}
 const panels=(p:[number,number][],start:number,rows:number,height:number,salt:number)=>{
  for(let e=0;e<p.length;e++){
   const a=new Vector3(p[e][0],0,-p[e][1]),b=new Vector3(p[(e+1)%p.length][0],0,-p[(e+1)%p.length][1])
   const along=b.clone().sub(a).normalize(),len=a.distanceTo(b),out=new Vector3(-along.z,0,along.x),cols=Math.max(1,Math.floor(len/2.1)),bay=len/cols
   for(let row=0;row<rows;row++)for(let col=0;col<cols;col++){
    const center=a.clone().addScaledVector(along,(col+.5)*bay).addScaledVector(out,.20);center.y=start+row*height+height*.52
    const panel=new PlaneGeometry(bay-.32,height-.6).rotateY(Math.atan2(out.x,out.z)).translate(center.x,center.y,center.z)
    const p1=center.clone().addScaledVector(along,-bay*.5+.10),p2=center.clone().addScaledVector(along,bay*.5-.10)
    p1.y-=(height-.45)*.5;p2.y=p1.y;metal.push(beam(p1,p2,.045))
    const p3=p1.clone();p3.y+=height-.45;metal.push(beam(p1,p3,.065))
    // One surface per pane: the old lit sheet was only 6 mm above glass,
    // producing depth fighting on oblique and distant facades.
    if(random(kind*932+e*133+row*31+col*7+salt)>.64){(random(row*61+col*13+e*7)>.25?warm:cool).push(panel)}else glass.push(panel)
   }
  }
 }
 panels(upper,4.3,floors,3.15,0);panels(lower,.05,1,3.8,713)
 const merge=(parts:BufferGeometry[])=>{const g=mergeGeometries(parts,false)!;parts.forEach(p=>p.dispose());g.computeBoundingSphere();return g}
 return {width,depth,geometry:[merge(stone),merge(glass),merge(metal),merge(warm),merge(cool)]}
}
export default memo(function CitySkyline({worldPositionRef}:{worldPositionRef:WorldPositionRef}){
 const refs=useRef<(InstancedMesh|null)[]>([])
 const resources=useMemo(()=>{
  const map=stoneMap()
  const materials=[
   new MeshStandardMaterial({map,color:'#b1b8bc',roughness:.86,metalness:.03}),
   new MeshPhysicalMaterial({color:'#344756',metalness:.25,roughness:.16,clearcoat:.85,clearcoatRoughness:.14,envMapIntensity:1.2}),
   new MeshStandardMaterial({color:'#454a50',metalness:.8,roughness:.35}),
   new MeshPhysicalMaterial({color:'#3f3934',emissive:'#ffc685',emissiveIntensity:.24,metalness:.15,roughness:.2,clearcoat:.85,clearcoatRoughness:.14,envMapIntensity:1.2}),
   new MeshPhysicalMaterial({color:'#283b47',emissive:'#b7dfec',emissiveIntensity:.16,metalness:.15,roughness:.2,clearcoat:.85,clearcoatRoughness:.14,envMapIntensity:1.2}),
  ]
  return {map,materials,templates:Array.from({length:6},(_,i)=>build(i))}
 },[])
 useEffect(()=>()=>{resources.map.dispose();resources.materials.forEach(m=>m.dispose());resources.templates.forEach(t=>t.geometry.forEach(g=>g.dispose()))},[resources])
 const scratch=useMemo(()=>({m:new Matrix4(),p:new Vector3(),s:new Vector3(1,1,1),q:new Quaternion(),axis:new Vector3(0,1,0)}),[])
 const last=useRef(NaN)
 useFrame(()=>{
  const carZ=worldPositionRef.current.z
  if(Math.abs(carZ-last.current)<.1)return;last.current=carZ
  const counts=Array(6).fill(0)
  for(let i=0;i<COUNT;i++){
   const side=i%2===0?-1:1,kind=Math.floor(random(Math.floor(i/2)*23+side*97)*6),t=resources.templates[kind],base=-Math.floor(i/2)*30
   const rel=((base-carZ-35)%PERIOD+PERIOD)%PERIOD,z=carZ+35-PERIOD+rel,index=counts[kind]++
   const x=roadCenterAt(z)+side*(26+t.width*.5+(Math.floor(i/12)%2)*5)
   scratch.p.set(x,-.22,z);scratch.q.setFromAxisAngle(scratch.axis,roadYawAt(z)*.65);scratch.m.compose(scratch.p,scratch.q,scratch.s)
   for(let role=0;role<5;role++)refs.current[kind*5+role]?.setMatrixAt(index,scratch.m)
  }
  for(let k=0;k<6;k++)for(let role=0;role<5;role++){const m=refs.current[k*5+role];if(m){m.count=counts[k];m.instanceMatrix.needsUpdate=true}}
 })
 return <>{resources.templates.flatMap((t,k)=>t.geometry.map((g,r)=><instancedMesh key={k+':'+r} ref={m=>{refs.current[k*5+r]=m}} args={[g,resources.materials[r],COUNT]} frustumCulled={false} receiveShadow castShadow={r===0||r===2}/>))}</>
})
