import { memo, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { AdditiveBlending, DoubleSide, Group, MeshBasicMaterial, MeshStandardMaterial } from 'three'
import { geometryCache } from '../utils/geometryCache'
import { roadYawAt } from '../utils/roadCurve'
import { ConceptTraffic } from './ConceptCar'
import { CRADLE_BATCHES, MISSILE_BATCHES } from './CombatAssets'

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
  // Reward — floating energy shard
  rewardCrystal: new MeshStandardMaterial({
    color: '#ffd75e', emissive: '#ffb300', emissiveIntensity: 1.6,
    metalness: 0.6, roughness: 0.15, toneMapped: false,
  }),
  rewardRing: new MeshBasicMaterial({
    color: '#ffe9a8', transparent: true, opacity: 0.75,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }),
  rewardMarker: new MeshBasicMaterial({
    color: '#ffb300', transparent: true, opacity: 0.35,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }),

  // Boost pylon — green holographic spire
  boostPylon: new MeshStandardMaterial({
    color: '#0a3a1a', emissive: '#39ff6a', emissiveIntensity: 0.9,
    transparent: true, opacity: 0.92, toneMapped: false,
  }),
  boostWire: new MeshBasicMaterial({
    color: '#39ff6a', wireframe: true, transparent: true, opacity: 0.5, toneMapped: false,
  }),
  boostRing: new MeshBasicMaterial({
    color: '#39ff6a', transparent: true, opacity: 0.8,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }),

  // Holo-crates (rocket launcher / triple rocket)
  crateOrange: new MeshStandardMaterial({
    color: '#2a1206', emissive: '#ff7a1a', emissiveIntensity: 0.5,
    transparent: true, opacity: 0.9, metalness: 0.5, roughness: 0.4,
  }),
  crateOrangeWire: new MeshBasicMaterial({
    color: '#ff7a1a', wireframe: true, transparent: true, opacity: 0.85, toneMapped: false,
  }),
  crateMagenta: new MeshStandardMaterial({
    color: '#26061f', emissive: '#ff2bd6', emissiveIntensity: 0.5,
    transparent: true, opacity: 0.9, metalness: 0.5, roughness: 0.4,
  }),
  crateMagentaWire: new MeshBasicMaterial({
    color: '#ff2bd6', wireframe: true, transparent: true, opacity: 0.85, toneMapped: false,
  }),
  beamOrange: new MeshBasicMaterial({
    color: '#ff7a1a', transparent: true, opacity: 0.14,
    blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false,
  }),
  beamMagenta: new MeshBasicMaterial({
    color: '#ff2bd6', transparent: true, opacity: 0.14,
    blending: AdditiveBlending, depthWrite: false, side: DoubleSide, toneMapped: false,
  }),
  holoRingOrange: new MeshBasicMaterial({
    color: '#ff7a1a', transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }),
  holoRingMagenta: new MeshBasicMaterial({
    color: '#ff2bd6', transparent: true, opacity: 0.5,
    blending: AdditiveBlending, depthWrite: false, toneMapped: false,
  }),
  missileIcon: new MeshStandardMaterial({
    color: '#ffb300', emissive: '#ff7a1a', emissiveIntensity: 1.2, toneMapped: false,
  }),
  missileNoseIcon: new MeshStandardMaterial({
    color: '#ffe9a8', emissive: '#ffb300', emissiveIntensity: 1.5, toneMapped: false,
  }),
  tripleIcon: new MeshStandardMaterial({
    color: '#ffd2f0', emissive: '#ff2bd6', emissiveIntensity: 1.4, toneMapped: false,
  }),
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
      // Floating energy shard
      return (
        <group position={position}>
          <group ref={spinRef}>
            <mesh geometry={geometryCache.getGeometry('reward-crystal')} material={MAT.rewardCrystal} />
            <mesh rotation={[Math.PI / 2.6, 0, 0]} geometry={geometryCache.getGeometry('reward-ring')} material={MAT.rewardRing} />
          </group>
          {/* Ground marker */}
          <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]} geometry={geometryCache.getGeometry('reward-marker')} material={MAT.rewardMarker} />
        </group>
      )
    }

    case 'cone': {
      // Boost pylon — green holographic spire
      return (
        <group position={position}>
          <mesh position={[0, 0.8, 0]} geometry={geometryCache.getGeometry('boost-pylon')} material={MAT.boostPylon} />
          {/* Wireframe twin for holo shimmer */}
          <mesh position={[0, 0.8, 0]} geometry={geometryCache.getGeometry('boost-pylon')} material={MAT.boostWire} />
          <group ref={spinRef}>
            <mesh position={[0, 1.05, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geometryCache.getGeometry('boost-ring')} material={MAT.boostRing} />
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
