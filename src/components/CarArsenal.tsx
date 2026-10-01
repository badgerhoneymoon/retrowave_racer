import { memo, useRef, useMemo, useEffect } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, ConeGeometry, Group, Mesh, MeshBasicMaterial } from 'three'
import { CANNON_BATCHES, BAY_BATCHES } from './CombatAssets'

export interface WeaponFeedback { plasmaAt:number; rocketAt:number }
const MUZZLE_GEO=new ConeGeometry(.13,.65,12)
function CarArsenal({feedback, triple}:{feedback?:MutableRefObject<WeaponFeedback>;triple:boolean}) {
  const mats=useMemo(()=>({plasma:new MeshBasicMaterial({color:'#b9f6ff',transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false}),rocket:new MeshBasicMaterial({color:'#ffb356',transparent:true,depthWrite:false,blending:AdditiveBlending,toneMapped:false})}),[])
  useEffect(()=>()=>{mats.plasma.dispose();mats.rocket.dispose()},[mats])
  const rail=useRef<Group>(null), flash=useRef<Group>(null), launch=useRef<Group>(null)
  useFrame(({clock})=>{
    const now=clock.elapsedTime*1000
    const p=feedback?Math.max(0,1-(now-feedback.current.plasmaAt)/130):0
    const r=feedback?Math.max(0,1-(now-feedback.current.rocketAt)/200):0
    if(rail.current)rail.current.position.z=p*.08
    if(flash.current){flash.current.visible=p>0;flash.current.scale.setScalar(.65+p*.65);for(const child of flash.current.children)((child as Mesh).material as MeshBasicMaterial).opacity=p*.8}
    if(launch.current){launch.current.visible=r>0;launch.current.scale.setScalar(.6+r*.7);for(const child of launch.current.children)((child as Mesh).material as MeshBasicMaterial).opacity=r*.55}
  })
  return <group dispose={null}>
    <group ref={rail}>{CANNON_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />)}</group>
    <group>{BAY_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />)}</group>
    <group ref={flash} visible={false} position={[0,.81,-1.35]}>
      {[-.27,.27].map(x=><mesh key={x} position={[x,0,0]} rotation={[-Math.PI/2,0,0]} geometry={MUZZLE_GEO} material={mats.plasma}/>)}
    </group>
    <group ref={launch} visible={false} position={[0,1.16,.41]}>
      {(triple?[-.24,0,.24]:[0]).map(x=><mesh key={x} position={[x,0,0]} geometry={MUZZLE_GEO} material={mats.rocket}/>)}
    </group>
  </group>
}
export default memo(CarArsenal)
