import { memo } from 'react'
import CombatBurst from './CombatBurst'
function ExplosionEffect({position,onComplete}:{position:[number,number,number];onComplete:()=>void}){return <CombatBurst position={position} onComplete={onComplete}/>}
export default memo(ExplosionEffect)
