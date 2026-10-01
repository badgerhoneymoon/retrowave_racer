import { BoxGeometry, ConeGeometry, CylinderGeometry, OctahedronGeometry, RingGeometry, SphereGeometry, TorusGeometry } from 'three'

// Geometry cache to reuse geometry instances across components
export class GeometryCache {
  private static instance: GeometryCache
  private cache = new Map<string, any>()

  private constructor() {
    // Pre-create commonly used geometries
    this.createCommonGeometries()
  }

  public static getInstance(): GeometryCache {
    if (!GeometryCache.instance) {
      GeometryCache.instance = new GeometryCache()
    }
    return GeometryCache.instance
  }

  private createCommonGeometries() {
    // Car geometries (legacy keys kept for compatibility)
    this.cache.set('car-body', new BoxGeometry(2, 0.8, 4))
    this.cache.set('car-accent', new BoxGeometry(1.8, 0.4, 3.5))
    this.cache.set('car-wheel', new CylinderGeometry(0.3, 0.3, 0.2))
    this.cache.set('car-windshield', new BoxGeometry(1.5, 0.6, 1.5))

    // --- Neon Overdrive car parts ---
    // 4-sided cylinders rotated 45° read as sleek wedges
    this.cache.set('car-hull', new CylinderGeometry(1.05, 1.35, 4.2, 4, 1))
    this.cache.set('car-nose', new ConeGeometry(0.95, 1.6, 4))
    this.cache.set('car-canopy', new SphereGeometry(0.62, 16, 12))
    this.cache.set('car-spoiler-wing', new BoxGeometry(2.1, 0.08, 0.5))
    this.cache.set('car-spoiler-strut', new BoxGeometry(0.12, 0.35, 0.3))
    this.cache.set('car-skirt', new BoxGeometry(0.22, 0.22, 3.2))
    this.cache.set('car-rim', new TorusGeometry(0.34, 0.07, 8, 24))
    this.cache.set('car-wheel-new', new CylinderGeometry(0.34, 0.34, 0.26, 18))
    this.cache.set('car-taillight', new BoxGeometry(1.7, 0.14, 0.08))
    this.cache.set('car-headlight', new BoxGeometry(0.34, 0.1, 0.08))
    this.cache.set('car-underglow', new RingGeometry(0.9, 1.9, 32))
    this.cache.set('car-exhaust', new CylinderGeometry(0.12, 0.16, 0.5, 10))
    this.cache.set('car-trail', new BoxGeometry(0.14, 0.03, 1))

    // Obstacle geometries
    this.cache.set('reward-cube', new BoxGeometry(1, 1, 1))
    this.cache.set('reward-inner', new BoxGeometry(0.8, 0.8, 0.8))
    this.cache.set('cone', new ConeGeometry(0.5, 1.5, 8))
    this.cache.set('blue-car-body', new BoxGeometry(1.8, 0.6, 3.5))
    this.cache.set('blue-car-windshield', new BoxGeometry(1.4, 0.4, 1.2))

    // --- Neon Overdrive obstacle parts ---
    this.cache.set('reward-crystal', new OctahedronGeometry(0.55))
    this.cache.set('reward-ring', new TorusGeometry(0.85, 0.045, 8, 40))
    this.cache.set('reward-marker', new RingGeometry(0.5, 0.7, 24))
    this.cache.set('boost-pylon', new ConeGeometry(0.55, 1.6, 6))
    this.cache.set('boost-ring', new TorusGeometry(0.7, 0.05, 8, 32))
    this.cache.set('enemy-hull', new CylinderGeometry(1.0, 1.25, 3.6, 4, 1))
    this.cache.set('enemy-canopy', new SphereGeometry(0.5, 12, 10))
    this.cache.set('enemy-wing', new BoxGeometry(2.3, 0.09, 0.6))
    // Automotive body parts (Neon Overdrive interceptor redesign)
    this.cache.set('enemy-body', new BoxGeometry(1.72, 0.5, 3.5))
    this.cache.set('enemy-hood', new BoxGeometry(1.6, 0.14, 1.1))
    this.cache.set('enemy-cabin', new BoxGeometry(1.32, 0.42, 1.7))
    this.cache.set('enemy-glass', new BoxGeometry(1.34, 0.2, 1.72))
    this.cache.set('enemy-rocker', new BoxGeometry(0.07, 0.1, 3.0))
    this.cache.set('enemy-lip', new BoxGeometry(1.5, 0.06, 0.32))
    this.cache.set('holo-crate', new BoxGeometry(1.15, 1.15, 1.15))
    this.cache.set('holo-ring', new TorusGeometry(1.0, 0.05, 8, 40))
    this.cache.set('pickup-beam', new CylinderGeometry(0.5, 0.9, 3.2, 12, 1, true))

    // Rocket launcher geometries
    this.cache.set('launcher-base', new CylinderGeometry(0.8, 0.8, 0.2))
    this.cache.set('launcher-body', new BoxGeometry(1.2, 0.8, 1.4))
    this.cache.set('launcher-tube', new CylinderGeometry(0.12, 0.12, 0.6))
    this.cache.set('launcher-light', new SphereGeometry(0.08))
    this.cache.set('launcher-glow', new SphereGeometry(0.3))
    
    // Triple rocket geometries
    this.cache.set('triple-rocket-box', new BoxGeometry(1.4, 1.2, 1.4))
    this.cache.set('triple-rocket-symbol', new CylinderGeometry(0.08, 0.08, 0.3))
    this.cache.set('triple-rocket-glow', new BoxGeometry(1.6, 1.4, 1.6))
    this.cache.set('triple-rocket-pulse', new SphereGeometry(0.2))
    this.cache.set('triple-rocket-indicator', new SphereGeometry(0.15))

    // Projectile geometries
    this.cache.set('plasma-core', new SphereGeometry(0.3, 8, 6))
    this.cache.set('plasma-glow', new SphereGeometry(0.5, 8, 6))
    
    // Missile geometries
    this.cache.set('missile-body', new CylinderGeometry(0.15, 0.3, 1.5))
    this.cache.set('missile-nose', new ConeGeometry(0.15, 0.5))
    this.cache.set('missile-fin', new BoxGeometry(0.1, 0.4, 0.05))
    this.cache.set('missile-thruster', new SphereGeometry(0.3))
    this.cache.set('missile-trail', new SphereGeometry(0.15))

    // Explosion geometries
    this.cache.set('explosion-particle', new SphereGeometry(0.2, 8, 6))
    this.cache.set('explosion-sphere', new SphereGeometry(1, 16, 16))
    this.cache.set('explosion-core', new SphereGeometry(0.5, 12, 12))
  }

  public getGeometry(key: string): any {
    const geometry = this.cache.get(key)
    if (!geometry) {
      console.warn(`Geometry cache miss for key: ${key}`)
      return null
    }
    return geometry
  }

  public dispose() {
    // Dispose all cached geometries
    this.cache.forEach(geometry => {
      if (geometry.dispose) {
        geometry.dispose()
      }
    })
    this.cache.clear()
  }
}

// Export singleton instance
export const geometryCache = GeometryCache.getInstance()