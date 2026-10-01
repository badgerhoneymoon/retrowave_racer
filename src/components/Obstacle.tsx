import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, Group, MeshBasicMaterial } from 'three'
import { geometryCache } from '../utils/geometryCache'
import { roadYawAt } from '../utils/roadCurve'
import { ConceptTraffic } from './ConceptCar'
import { CRADLE_BATCHES, MISSILE_BATCHES } from './CombatAssets'
import { REWARD_BATCHES, BOOST_BATCHES } from './PickupAssets'

interface ObstacleProps {
  position: [number, number, number]
  type: 'reward' | 'cone' | 'car' | 'rocket_launcher' | 'triple_rocket'
  velocity?: number // cars only: >0 oncoming (faces player), <0 same direction
  obstacleId?: string // stable identity — cars hash this to pick a fixed model variant
}

// String hash → variant index. Position would change every frame for moving
// traffic (that made cars morph/blink); the obstacle id never changes.
function variantFromId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) | 0
  }
  return Math.abs(h) % 6
}

// ---------------------------------------------------------------------------
// Shared module-level materials & geometry: obstacles mount/unmount constantly
// while driving, so nothing GPU-related is allocated per obstacle instance.
// (Same pattern as AreaMissile — plain `material={SHARED}` props are not owned
// by R3F and are never auto-disposed.)
// ---------------------------------------------------------------------------

const MAT = {
  rewardMarker: new MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: .35, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  boostRing: new MeshBasicMaterial({ color: '#39ff6a', transparent: true, opacity: .65, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  holoRingOrange: new MeshBasicMaterial({ color: '#ff7a1a', transparent: true, opacity: .5, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
  holoRingMagenta: new MeshBasicMaterial({ color: '#ff2bd6', transparent: true, opacity: .5, blending: AdditiveBlending, depthWrite: false, toneMapped: false }),
}

// Deterministic phase offset per obstacle so pickups don't bob in sync
function phaseFromPosition(position: [number, number, number]) {
  return (position[0] * 12.9898 + position[2] * 78.233) % (Math.PI * 2)
}

function Obstacle({ position, type, velocity, obstacleId }: ObstacleProps) {
  const spinRef = useRef<Group>(null)
  const phase = useMemo(() => phaseFromPosition(position), [position])

  useFrame(({ clock }) => {
    if (!spinRef.current) return
    const t = clock.elapsedTime
    // Pickups float and spin; cars and boost pylons stay planted
    if (type === 'reward' || type === 'rocket_launcher' || type === 'triple_rocket') {
      spinRef.current.rotation.y = t * 1.4 + phase
      spinRef.current.position.y = 1.05 + Math.sin(t * 2 + phase) * 0.18
    } else if (type === 'cone') {
      spinRef.current.rotation.y = t * 2.2 + phase
    }
  })

  switch (type) {
    case 'reward': {
      // Gold energy core in a machined protective frame
      return (
        <group position={position} dispose={null}>
          <group ref={spinRef}>
            {REWARD_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />)}
          </group>
          {/* Ground marker */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometryCache.getGeometry('reward-marker')} material={MAT.rewardMarker} />
        </group>
      )
    }

    case 'cone': {
      // Green boost cone retains its silhouette with physical armor and light strips
      return (
        <group position={position} dispose={null}>
          {BOOST_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />)}
          <group ref={spinRef}>
            <mesh position={[0,-.43,0]} rotation={[Math.PI/2,0,0]} geometry={geometryCache.getGeometry('boost-ring')} material={MAT.boostRing} />
          </group>
        </group>
      )
    }

    case 'car': {
      // Downloaded GLB traffic — variant locked to the obstacle's stable id.
      // Traffic still yaws with the road's direction so cars track the bends.
      const oncoming = (velocity ?? 0) > 0
      const yaw = roadYawAt(position[2])
      const variant = variantFromId(obstacleId ?? `${position[0]}:${position[2]}`)
      return (
        <group position={position} rotation={[0, (oncoming ? Math.PI : 0) + yaw, 0]}>
          <ConceptTraffic variant={variant} />
        </group>
      )
    }

    case 'rocket_launcher':
    case 'triple_rocket': {
      const triple=type==='triple_rocket'
      return <group position={position} dispose={null}>
        <group ref={spinRef}>
          {CRADLE_BATCHES.map((b,i)=><mesh key={i} geometry={b.geometry} material={b.material} castShadow receiveShadow />)}
          {(triple?[-.34,0,.34]:[0]).map((x,i)=><group key={i} position={[x,.14,0]} rotation={[Math.PI/2,0,0]} scale={triple?.58:.77}>
            {MISSILE_BATCHES.map((b,j)=><mesh key={j} geometry={b.geometry} material={b.material} />)}
          </group>)}
        </group>
        <mesh position={[0,-.45,0]} rotation={[-Math.PI/2,0,0]} geometry={geometryCache.getGeometry('holo-ring')} material={triple?MAT.holoRingMagenta:MAT.holoRingOrange}/>
      </group>
    }

    default:
      return null
  }
}

export default memo(Obstacle)
