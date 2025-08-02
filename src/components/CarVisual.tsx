import { memo, useMemo, forwardRef } from 'react'
import { Group } from 'three'
import { geometryCache } from '../utils/geometryCache'

interface CarVisualProps {
  position?: [number, number, number]
  isColliding: boolean
  spreadShotActive: boolean
  isBoosted: boolean
}

const CarVisual = forwardRef<Group, CarVisualProps>(({ 
  position = [0, 0, 0], 
  isColliding, 
  spreadShotActive, 
  isBoosted 
}, ref) => {
  // Visual colors based on state
  const getCarColor = () => {
    if (isColliding) return "#ffffff" // White flash on collision
    if (spreadShotActive) return "#ffff00" // Yellow when spread shot active
    if (isBoosted) return "#00ff00"   // Green when boosted
    return "#ff0080"                  // Normal pink
  }
  
  const getAccentColor = () => {
    if (isColliding) return "#ffffff" // White flash on collision
    if (spreadShotActive) return "#ffff80" // Light yellow when spread shot active
    if (isBoosted) return "#80ff80"   // Light green when boosted
    return "#ff6600"                  // Normal orange
  }

  // Memoized materials to prevent recreation on every render
  const carBodyMaterial = useMemo(() => {
    return <meshStandardMaterial color={getCarColor()} />
  }, [isColliding, spreadShotActive, isBoosted])

  const carAccentMaterial = useMemo(() => {
    return <meshStandardMaterial color={getAccentColor()} />
  }, [isColliding, spreadShotActive, isBoosted])

  const wheelMaterial = useMemo(() => {
    return <meshStandardMaterial color="#222" />
  }, [])

  const windshieldMaterial = useMemo(() => {
    return <meshStandardMaterial color="#00ffff" transparent opacity={0.7} />
  }, [])

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.5, 0]} geometry={geometryCache.getGeometry('car-body')}>
        {carBodyMaterial}
      </mesh>
      
      <mesh position={[0, 0.2, 0]} geometry={geometryCache.getGeometry('car-accent')}>
        {carAccentMaterial}
      </mesh>
      
      <mesh position={[-0.7, 0, 1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[0.7, 0, 1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[-0.7, 0, -1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      <mesh position={[0.7, 0, -1.3]} geometry={geometryCache.getGeometry('car-wheel')}>
        {wheelMaterial}
      </mesh>
      
      <mesh position={[0, 0.9, 0.5]} geometry={geometryCache.getGeometry('car-windshield')}>
        {windshieldMaterial}
      </mesh>
    </group>
  )
})

CarVisual.displayName = 'CarVisual'

export default memo(CarVisual)