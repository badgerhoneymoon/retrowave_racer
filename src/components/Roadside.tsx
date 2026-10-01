import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, CanvasTexture, CatmullRomCurve3, CylinderGeometry, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace, TubeGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { roadCenterAt, roadYawAt } from '../utils/roadCurve'
function pavementMaps(){
 const color=document.createElement('canvas'),rough=document.createElement('canvas');color.width=rough.width=color.height=rough.height=256
 const c=color.getContext('2d')!,r=rough.getContext('2d')!
 c.fillStyle='#969a9b';c.fillRect(0,0,256,256);r.fillStyle='#d4d4d4';r.fillRect(0,0,256,256)
 for(let i=0;i<9000;i++){const x=(i*127.1)%256,y=(i*31.7)%256,v=110+(i*17)%55;c.fillStyle=`rgba(${v},${v},${v},.18)`;c.fillRect(x,y,1,1)}
 c.strokeStyle='#616b70';r.strokeStyle='#f0f0f0';c.lineWidth=1.5;r.lineWidth=2
 for(let y=0;y<256;y+=128){for(const ctx of[c,r]){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(256,y);ctx.stroke()}}
 for(const ctx of[c,r]){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,256);ctx.stroke();ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(128,256);ctx.stroke()}
 const maps=[new CanvasTexture(color),new CanvasTexture(rough)];maps[0].colorSpace=SRGBColorSpace;maps.forEach(m=>{m.wrapS=m.wrapT=RepeatWrapping;m.anisotropy=8});return maps
}
function ribbon(){
 const profile=[[19.1,-.49],[19.35,-.49],[19.35,-.23],[25.3,-.23],[25.3,-.52]]
 const positions:number[]=[],uv:number[]=[],indices:number[]=[]
 for(let side=0;side<2;side++){
  const sign=side===0?-1:1,offset=positions.length/3
  for(let row=0;row<=180;row++)for(let col=0;col<profile.length;col++){positions.push(sign*profile[col][0],profile[col][1],60-row*3);uv.push(profile[col][0]/2,(60-row*3)/2)}
  for(let row=0;row<180;row++)for(let col=0;col<profile.length-1;col++){
   const a=offset+row*5+col,b=a+1,c=a+5,d=c+1
   if(sign>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d)
  }
 }
 const g=new BufferGeometry();g.setAttribute('position',new BufferAttribute(new Float32Array(positions),3));g.setAttribute('uv',new BufferAttribute(new Float32Array(uv),2));g.setIndex(indices);return g
}
export default memo(function Roadside({carZ=0}:{carZ?:number}){
 const pavement=useRef<Mesh>(null),posts=useRef<InstancedMesh>(null),lenses=useRef<InstancedMesh>(null)
 const resources=useMemo(()=>{
  const maps=pavementMaps(),geometry=ribbon()
  const pole=new TubeGeometry(new CatmullRomCurve3([new Vector3(0,0,0),new Vector3(0,6.7,0),new Vector3(-.15,7.9,0),new Vector3(-1.3,8.45,0),new Vector3(-2.35,8.25,0)]),16,.075,8,false)
  const base=new CylinderGeometry(.23,.34,.45,8).translate(0,.22,0)
  const housing=new CylinderGeometry(.28,.38,.16,12).translate(-2.3,8.18,0)
  const postGeometry=mergeGeometries([pole,base,housing],false)!;[pole,base,housing].forEach(g=>g.dispose())
  const lensGeometry=new CylinderGeometry(.26,.3,.035,12).translate(-2.3,8.08,0)
  const pavementMaterial=new MeshStandardMaterial({map:maps[0],roughnessMap:maps[1],color:'#a5afb8',roughness:.95})
  const metalMaterial=new MeshStandardMaterial({color:'#647380',metalness:.8,roughness:.36})
  const lensMaterial=new MeshStandardMaterial({color:'#fff1cf',emissive:'#ffe0a5',emissiveIntensity:2.8,roughness:.3})
  return {maps,geometry,postGeometry,lensGeometry,pavementMaterial,metalMaterial,lensMaterial}
 },[])
 useEffect(()=>()=>{resources.maps.forEach(t=>t.dispose());resources.geometry.dispose();resources.postGeometry.dispose();resources.lensGeometry.dispose();resources.pavementMaterial.dispose();resources.metalMaterial.dispose();resources.lensMaterial.dispose()},[resources])
 const last=useRef(NaN),scratch=useMemo(()=>new Matrix4(),[])
 useFrame(()=>{
  const anchor=Math.floor(carZ/15)*15;if(anchor===last.current||!pavement.current)return;last.current=anchor
  const position=resources.geometry.attributes.position,uv=resources.geometry.attributes.uv,profile=[[19.1,-.49],[19.35,-.49],[19.35,-.23],[25.3,-.23],[25.3,-.52]]
  for(let i=0;i<position.count;i++){
   const side=i<905?-1:1,j=i%905,col=j%5,z=60-Math.floor(j/5)*3+anchor
   position.setXYZ(i,roadCenterAt(z)+side*profile[col][0],profile[col][1],z)
   uv.setXY(i,profile[col][0]/2,z/2)
  }
  position.needsUpdate=uv.needsUpdate=true;resources.geometry.computeVertexNormals();resources.geometry.computeBoundingSphere()
  const lampAnchor=Math.floor(carZ/36)*36
  for(let i=0;i<32;i++){
   const sign=i%2===0?-1:1,z=lampAnchor+36-Math.floor(i/2)*36,x=roadCenterAt(z)+sign*22.5
   scratch.makeRotationY((sign<0?Math.PI:0)+roadYawAt(z));scratch.setPosition(x,-.23,z)
   posts.current?.setMatrixAt(i,scratch);lenses.current?.setMatrixAt(i,scratch)
  }
  if(posts.current)posts.current.instanceMatrix.needsUpdate=true
  if(lenses.current)lenses.current.instanceMatrix.needsUpdate=true
 })
 return <>
  <mesh ref={pavement} geometry={resources.geometry} material={resources.pavementMaterial} receiveShadow/>
  <instancedMesh ref={posts} args={[resources.postGeometry,resources.metalMaterial,32]} frustumCulled={false} castShadow receiveShadow/>
  <instancedMesh ref={lenses} args={[resources.lensGeometry,resources.lensMaterial,32]} frustumCulled={false}/>
 </>
})
