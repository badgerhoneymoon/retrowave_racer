import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Color, CylinderGeometry, InstancedMesh, Matrix4, MeshBasicMaterial, Quaternion, Vector3 } from 'three'
const COUNT=28, UP=new Vector3(0,1,0)
const GEO=new CylinderGeometry(1,1,1,6,1,true)
const MAT=new MeshBasicMaterial({color:'#ffbd72',transparent:true,opacity:.48,blending:AdditiveBlending,depthWrite:false,toneMapped:false})
function MissileTrail({missilePosition,isActive}:{missilePosition:Vector3;isActive:boolean}) {
  const mesh=useRef<InstancedMesh>(null), head=useRef(-1), count=useRef(0), elapsed=useRef(0)
  const points=useMemo(()=>Array.from({length:COUNT},()=>new Vector3()),[])
  const scratch=useMemo(()=>({mid:new Vector3(),dir:new Vector3(),scale:new Vector3(),q:new Quaternion(),m:new Matrix4(),c:new Color()}),[])
  useEffect(()=>{const current=mesh.current;return()=>{current?.dispose()}},[])
  useFrame((_,delta)=>{
    if(!mesh.current)return
    elapsed.current+=delta
    if(isActive&&elapsed.current>=1/90){elapsed.current=0;head.current=(head.current+1)%COUNT;points[head.current].copy(missilePosition);count.current=Math.min(COUNT,count.current+1)}
    const n=Math.max(0,count.current-1);mesh.current.count=n
    for(let i=0;i<n;i++){
      const a=points[(head.current-i+COUNT)%COUNT], b=points[(head.current-i-1+COUNT)%COUNT]
      scratch.dir.subVectors(a,b);const length=scratch.dir.length();scratch.q.setFromUnitVectors(UP,scratch.dir.normalize());scratch.mid.copy(a).add(b).multiplyScalar(.5)
      const width=.085*Math.pow(1-i/COUNT,1.4);scratch.scale.set(width,Math.max(.001,length*1.03),width);scratch.m.compose(scratch.mid,scratch.q,scratch.scale);mesh.current.setMatrixAt(i,scratch.m)
      scratch.c.setRGB(1, .26+.5*(1-i/COUNT), .08+.35*(1-i/COUNT));mesh.current.setColorAt(i,scratch.c)
    }
    mesh.current.instanceMatrix.needsUpdate=true;if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true
  })
  return <instancedMesh ref={mesh} args={[GEO,MAT,COUNT]} frustumCulled={false} dispose={null} />
}
export default MissileTrail
