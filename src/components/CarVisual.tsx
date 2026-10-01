import { memo, useMemo, useRef, useEffect, forwardRef } from 'react'
import type { MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
} from 'three'
import { geometryCache } from '../utils/geometryCache'
import { HeroCarModel } from './CarModel'

interface CarVisualProps {
  position?: [number, number, number]
  isColliding: boolean
  spreadShotActive: boolean
  isBoosted: boolean
  tripleRocketActive?: boolean
  speedRef?: MutableRefObject<number>
}

const CarVisual = forwardRef<Group, CarVisualProps>(({
  position = [0, 0, 0],
  isColliding,
  spreadShotActive,
  isBoosted,
  tripleRocketActive = false,
  speedRef
}, ref) => {
  const bobRef = useRef<Group>(null)
  const exhaustLeftRef = useRef<any>(null)
  const exhaustRightRef = useRef<any>(null)
  const trailLeftRef = useRef<Mesh>(null)
  const trailRightRef = useRef<Mesh>(null)

  // Visual colors based on state (mechanic feedback — unchanged semantics)
  const getCarColor = () => {
    if (isColliding) return '#ffffff' // White flash on collision
    if (tripleRocketActive) return '#ff6600' // Orange when triple rocket active
    if (spreadShotActive) return '#ffff00' // Yellow when spread shot active
    if (isBoosted) return '#00ff00' // Green when boosted
    return '#ff2bd6' // Neon magenta
  }

  const getAccentColor = () => {
    if (isColliding) return '#ffffff'
    if (tripleRocketActive) return '#ffb300'
    if (spreadShotActive) return '#ffff80'
    if (isBoosted) return '#80ff80'
    return '#00f0ff' // Cyan trim
  }

  // --- Materials (real THREE materials, memoized) ---
  const bodyMaterial = useMemo(
    () =>
      new MeshPhysicalMaterial({
        color: getCarColor(),
        emissive: getCarColor(),
        emissiveIntensity: isColliding ? 1.2 : 0.25,
        metalness: 0.65,
        roughness: 0.25,
        clearcoat: 1.0,          // wet-look clearcoat — picks up the HDRI sunset
        clearcoatRoughness: 0.18,
      }),
    [isColliding, spreadShotActive, isBoosted, tripleRocketActive]
  )

  const glassMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#0a2a3a',
        emissive: '#00f0ff',
        emissiveIntensity: 0.15,
        metalness: 0.9,
        roughness: 0.08,
        transparent: true,
        opacity: 0.7,
      }),
    []
  )

  const tireMaterial = useMemo(
    () => new MeshStandardMaterial({ color: '#0d0d12', roughness: 0.9, metalness: 0.1 }),
    []
  )

  const rimMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#00f0ff',
        emissive: '#00f0ff',
        emissiveIntensity: 1.4,
        toneMapped: false,
      }),
    []
  )

  const tailMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#ff2445',
        emissive: '#ff2445',
        emissiveIntensity: 2.2,
        toneMapped: false,
      }),
    []
  )

  const headlightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: '#eaffff',
        emissive: '#bffcff',
        emissiveIntensity: 2.0,
        toneMapped: false,
      }),
    []
  )

  const underglowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: getAccentColor(),
        transparent: true,
        opacity: 0.32,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [isColliding, spreadShotActive, isBoosted, tripleRocketActive]
  )

  const exhaustMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: isBoosted ? '#80ff80' : '#2fb9c9',
        transparent: true,
        opacity: 0.6,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [isBoosted]
  )

  // Taillight trail streaks (animated in the frame loop from speedRef)
  const trailMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: '#ff2456',
        transparent: true,
        opacity: 0,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )

  // Dispose GPU programs when state-dependent materials are swapped out,
  // and when the component unmounts
  useEffect(() => {
    return () => {
      bodyMaterial.dispose()
      underglowMaterial.dispose()
      exhaustMaterial.dispose()
    }
  }, [bodyMaterial, underglowMaterial, exhaustMaterial])

  useEffect(() => {
    return () => {
      ;[glassMaterial, tireMaterial, rimMaterial, tailMaterial, headlightMaterial, trailMaterial].forEach(m => m.dispose())
    }
  }, [glassMaterial, tireMaterial, rimMaterial, tailMaterial, headlightMaterial, trailMaterial])

  // Hover bob + exhaust pulse + taillight trails (visual only)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (bobRef.current) {
      bobRef.current.position.y = Math.sin(t * 2.1) * 0.045
      bobRef.current.rotation.z = Math.sin(t * 1.4) * 0.008
      bobRef.current.rotation.x = Math.sin(t * 1.7) * 0.006
    }
    const pulse = (isBoosted ? 1.15 : 0.7) + Math.sin(t * (isBoosted ? 18 : 7)) * 0.15
    if (exhaustLeftRef.current) exhaustLeftRef.current.scale.setScalar(pulse)
    if (exhaustRightRef.current) exhaustRightRef.current.scale.setScalar(pulse)

    // Light streaks stretch and brighten with speed; hidden at crawl
    const spd = speedRef ? Math.abs(speedRef.current) : 0
    const targetOpacity = Math.min(0.45, Math.max(0, spd - 0.25) * 0.35)
    trailMaterial.opacity += (targetOpacity - trailMaterial.opacity) * 0.15
    const len = 0.6 + spd * 5.5
    for (const trail of [trailLeftRef.current, trailRightRef.current]) {
      if (!trail) continue
      trail.scale.set(1, 1, len)
      trail.position.z = 2.25 + len * 0.5
      trail.visible = trailMaterial.opacity > 0.02
    }
  })

  return (
    <group ref={ref} position={position}>
      <group ref={bobRef}>
        {/* Downloaded GLB hero body ('80s wedge) — materials assigned by role
            so collision/boost recolors keep working */}
        <HeroCarModel
          bodyMaterial={bodyMaterial}
          glassMaterial={glassMaterial}
          tireMaterial={tireMaterial}
          rimMaterial={rimMaterial}
          tailMaterial={tailMaterial}
        />

        {/* Headlights (the GLB's own front lenses are plain glass — add neon) */}
        <mesh position={[-0.55, 0.5, -2.18]} geometry={geometryCache.getGeometry('car-headlight')} material={headlightMaterial} />
        <mesh position={[0.55, 0.5, -2.18]} geometry={geometryCache.getGeometry('car-headlight')} material={headlightMaterial} />

        {/* Taillight light streaks (stretch with speed) */}
        <mesh ref={trailLeftRef} position={[-0.5, 0.6, 2.3]} geometry={geometryCache.getGeometry('car-trail')} material={trailMaterial} visible={false} />
        <mesh ref={trailRightRef} position={[0.5, 0.6, 2.3]} geometry={geometryCache.getGeometry('car-trail')} material={trailMaterial} visible={false} />

        {/* Exhaust glows */}
        <mesh ref={exhaustLeftRef} position={[-0.5, 0.45, 2.26]} geometry={geometryCache.getGeometry('triple-rocket-indicator')} material={exhaustMaterial} />
        <mesh ref={exhaustRightRef} position={[0.5, 0.45, 2.26]} geometry={geometryCache.getGeometry('triple-rocket-indicator')} material={exhaustMaterial} />

        {/* Underglow */}
        <mesh
          position={[0, -0.42, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={[1, 1.35, 1]}
          geometry={geometryCache.getGeometry('car-underglow')}
          material={underglowMaterial}
        />

        {/* Triple rocket mode indicator - 3 orange glows on the car */}
        {tripleRocketActive && (
          <>
            <mesh position={[-0.5, 1.25, -1.5]} geometry={geometryCache.getGeometry('triple-rocket-indicator')}>
              <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={2} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            <mesh position={[0, 1.25, -1.5]} geometry={geometryCache.getGeometry('triple-rocket-indicator')}>
              <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={2} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            <mesh position={[0.5, 1.25, -1.5]} geometry={geometryCache.getGeometry('triple-rocket-indicator')}>
              <meshStandardMaterial color="#ff6600" emissive="#ff3300" emissiveIntensity={2} transparent opacity={0.9} toneMapped={false} />
            </mesh>
          </>
        )}
      </group>
    </group>
  )
})

CarVisual.displayName = 'CarVisual'

export default memo(CarVisual)
