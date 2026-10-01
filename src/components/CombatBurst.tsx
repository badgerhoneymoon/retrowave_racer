import { memo, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, BoxGeometry, CanvasTexture, RepeatWrapping, DynamicDrawUsage, InstancedBufferAttribute, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial, PlaneGeometry, Quaternion, RingGeometry, ShaderMaterial, Vector3, Euler } from 'three'
import { combatMaterials, COMBAT_GLOW } from './CombatAssets'
import { triggerFlash } from './FlashLights'
// Cache the same three-octave cloud detail once. Sampling a tiny repeatable
// texture avoids recomputing dozens of noise hashes for every smoke pixel.
const noiseCanvas=document.createElement('canvas');noiseCanvas.width=noiseCanvas.height=128
const noiseContext=noiseCanvas.getContext('2d')!,noiseImage=noiseContext.createImageData(128,128)
const grid=(x:number,y:number,size:number)=>{const v=Math.sin(((x%size+size)%size)*127.1+((y%size+size)%size)*311.7)*43758.5453;return v-Math.floor(v)}
for(let y=0;y<128;y++)for(let x=0;x<128;x++){
 let n=0,weight=.5
 for(let octave=0;octave<3;octave++){
  const size=4*2**octave,px=x/128*size,py=y/128*size,ix=Math.floor(px),iy=Math.floor(py),fx=px-ix,fy=py-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy)
  const a=grid(ix,iy,size)*(1-u)+grid(ix+1,iy,size)*u,b=grid(ix,iy+1,size)*(1-u)+grid(ix+1,iy+1,size)*u;n+=weight*(a*(1-v)+b*v);weight*=.5
 }
 const i=(y*128+x)*4;noiseImage.data[i]=noiseImage.data[i+1]=noiseImage.data[i+2]=Math.round(n*255);noiseImage.data[i+3]=255
}
noiseContext.putImageData(noiseImage,0,0)
const CLOUD_NOISE=new CanvasTexture(noiseCanvas);CLOUD_NOISE.wrapS=CLOUD_NOISE.wrapT=RepeatWrapping
const VERTEX=`
attribute float aLife;attribute float aSeed;
varying vec2 vUv;varying float vLife;varying float vSeed;varying float vDepth;
void main(){vUv=uv;vLife=aLife;vSeed=aSeed;
 vec4 center=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
 vec3 right=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]);
 vec3 up=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]);
 center.xyz+=right*position.x*length(instanceMatrix[0].xyz)+up*position.y*length(instanceMatrix[1].xyz);
 vec4 view=viewMatrix*center;vDepth=-view.z;gl_Position=projectionMatrix*view;}`
const FRAGMENT=`
uniform float uSmoke;uniform sampler2D uCloud;varying vec2 vUv;varying float vLife;varying float vSeed;varying float vDepth;
void main(){vec2 uv=vUv*2.-1.;float n=texture2D(uCloud,uv*.38+vec2(vSeed,vSeed*.37+vLife*.11)).r;float radius=length(uv);
 float edge=1.-smoothstep(.48+n*.22,1.,radius);float alpha=edge*(.35+n*.65)*vLife;vec3 color;
 if(uSmoke>.5){color=mix(vec3(.12,.13,.17),vec3(.35,.31,.28),n);alpha*=.66;}
 else{float heat=clamp(n*1.8+vLife*.6-radius*.3,0.,1.);color=mix(vec3(.55,.06,.012),vec3(1.5,.45,.025),smoothstep(.2,.7,heat));color=mix(color,vec3(2.2,1.5,.52),smoothstep(.7,1.,heat));alpha*=.85;}
 float fog=smoothstep(80.,250.,vDepth);color=mix(color,vec3(.086,.02,.153),fog);alpha*=1.-fog*.7;
 if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);}`
const FIRE_MAT=new ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms:{uSmoke:{value:0},uCloud:{value:CLOUD_NOISE}},transparent:true,depthWrite:false,toneMapped:false})
const SMOKE_MAT=new ShaderMaterial({vertexShader:VERTEX,fragmentShader:FRAGMENT,uniforms:{uSmoke:{value:1},uCloud:{value:CLOUD_NOISE}},transparent:true,depthWrite:false,toneMapped:false})
const DEBRIS_GEO=new BoxGeometry(.12,.035,.23), RING_GEO=new RingGeometry(.96,1,72), FLASH_GEO=new PlaneGeometry(1,1)
function spriteGeometry(count:number){const g=new PlaneGeometry(1,1);g.setAttribute('aLife',new InstancedBufferAttribute(new Float32Array(count),1).setUsage(DynamicDrawUsage));g.setAttribute('aSeed',new InstancedBufferAttribute(Float32Array.from({length:count},(_,i)=>(i*.61803398875)%1),1));return g}
interface Props{position:[number,number,number];onComplete:()=>void;area?:boolean}
function CombatBurst({position,onComplete,area=false}:Props){
 const fire=useRef<InstancedMesh>(null),smoke=useRef<InstancedMesh>(null),debris=useRef<InstancedMesh>(null),ring=useRef<Mesh>(null),flash=useRef<Mesh>(null),time=useRef(0),done=useRef(false)
 const count=area?10:6, pieces=area?24:12, duration=area?2:1.25
 const resources=useMemo(()=>({fire:spriteGeometry(count),smoke:spriteGeometry(count),ring:new MeshBasicMaterial({color:area?'#ffb453':'#6be9ff',transparent:true,opacity:0,blending:AdditiveBlending,depthWrite:false,side:2,toneMapped:false}),flash:new MeshBasicMaterial({map:COMBAT_GLOW,color:area?'#ffe9ac':'#c5f8ff',transparent:true,opacity:0,blending:AdditiveBlending,depthWrite:false,side:2,toneMapped:false}),m:new Matrix4(),p:new Vector3(),s:new Vector3(),q:new Quaternion(),e:new Euler()}),[count,area])
 useEffect(()=>{const instances=[fire.current,smoke.current,debris.current];triggerFlash(position[0],position[1]+1.5,position[2],area?'#ffc47b':'#a4eeff',area?140:70,area?.65:.25);return()=>{instances.forEach(m=>m?.dispose());resources.fire.dispose();resources.smoke.dispose();resources.ring.dispose();resources.flash.dispose()}},[position,resources,area])
 useFrame(({camera},delta)=>{
  time.current+=delta;const t=time.current, progress=t/duration
  if(progress>=1){if(!done.current){done.current=true;onComplete()}return}
  if(flash.current){flash.current.quaternion.copy(camera.quaternion);flash.current.scale.setScalar((area?4.5:2.3)*(1+t*4));resources.flash.opacity=Math.max(0,1-t/.115)*.8;flash.current.visible=t<.115}
  if(ring.current){const r=Math.min(area?12:3.8,.45+t*(area?26:13));ring.current.scale.setScalar(r);resources.ring.opacity=Math.max(0,1-t/.55)*.64;ring.current.visible=t<.55}
  if(fire.current&&smoke.current){
   const fa=resources.fire.getAttribute('aLife') as InstancedBufferAttribute,sa=resources.smoke.getAttribute('aLife') as InstancedBufferAttribute
   for(let i=0;i<count;i++){
    const a=i*2.39996, delay=(i%3)*.028, age=Math.max(0,t-delay),k=Math.min(1,age/(area?.65:.35)),spread=(area?2.6:1.1)*Math.sin(k*Math.PI*.65)
    resources.p.set(Math.cos(a)*spread,(i%3)*.5+age*2,Math.sin(a)*spread);const size=(area?2.2:1.0)*(Math.sin(k*Math.PI)*1.1+.15);resources.s.set(size,size,1);resources.m.compose(resources.p,resources.q.identity(),resources.s);fire.current.setMatrixAt(i,resources.m);fa.setX(i,Math.max(0,1-k))
    const st=Math.max(0,t-.12-delay), sp=Math.min(1,st/(duration-.12)),drift=(area?2.2:1.0)*sp
    resources.p.set(Math.cos(a)*(spread*.55+drift),.5+st*(area?2.9:1.6)+(i%3)*.22,Math.sin(a)*(spread*.55+drift));const smokeSize=(area?2.0:.8)+sp*(area?3.5:1.5);resources.s.set(smokeSize,smokeSize,1);resources.m.compose(resources.p,resources.q,resources.s);smoke.current.setMatrixAt(i,resources.m);sa.setX(i,Math.min(1,st*7)*Math.pow(1-sp,1.5))
   }fire.current.instanceMatrix.needsUpdate=true;smoke.current.instanceMatrix.needsUpdate=true;fa.needsUpdate=true;sa.needsUpdate=true
  }
  if(debris.current){for(let i=0;i<pieces;i++){
    const a=i*2.39996, speed=(area?7:4)+(i%4)*.8, up=(area?6:3.5)+(i%3),ground=-position[1]-.46
    const y=Math.max(ground,up*t-7*t*t);resources.p.set(Math.cos(a)*speed*t,y,Math.sin(a)*speed*t);resources.e.set(i+t*7,i*.6+t*5,i*.3+t*3);resources.q.setFromEuler(resources.e);const fade=Math.max(.001,1-Math.max(0,progress-.65)/.35);resources.s.setScalar((1+(i%3)*.25)*fade);resources.m.compose(resources.p,resources.q,resources.s);debris.current.setMatrixAt(i,resources.m)
   }debris.current.instanceMatrix.needsUpdate=true}
 })
 return <group position={position} dispose={null}>
  <mesh ref={flash} geometry={FLASH_GEO} material={resources.flash} frustumCulled={false}/>
  <mesh ref={ring} geometry={RING_GEO} material={resources.ring} position={[0,-position[1]-.475,0]} rotation={[-Math.PI/2,0,0]}/>
  <instancedMesh ref={fire} args={[resources.fire,FIRE_MAT,count]} frustumCulled={false}/>
  <instancedMesh ref={smoke} args={[resources.smoke,SMOKE_MAT,count]} frustumCulled={false}/>
  <instancedMesh ref={debris} args={[DEBRIS_GEO,combatMaterials.edge,pieces]} frustumCulled={false}/>
 </group>
}
export default memo(CombatBurst)
