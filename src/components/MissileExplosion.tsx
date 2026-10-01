import { memo } from 'react'
import CombatBurst from './CombatBurst'
function MissileExplosion({position,onComplete}:{position:[number,number,number];onComplete:()=>void}){return <CombatBurst position={position} onComplete={onComplete} area/>}
export default memo(MissileExplosion)
