import { BoxGeometry, ConeGeometry, CylinderGeometry, SphereGeometry } from 'three'

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
    // Car geometries
    this.cache.set('car-body', new BoxGeometry(2, 0.8, 4))
    this.cache.set('car-accent', new BoxGeometry(1.8, 0.4, 3.5))
    this.cache.set('car-wheel', new CylinderGeometry(0.3, 0.3, 0.2))
    this.cache.set('car-windshield', new BoxGeometry(1.5, 0.6, 1.5))

    // Obstacle geometries
    this.cache.set('reward-cube', new BoxGeometry(1, 1, 1))
    this.cache.set('reward-inner', new BoxGeometry(0.8, 0.8, 0.8))
    this.cache.set('cone', new ConeGeometry(0.5, 1.5, 8))
    this.cache.set('blue-car-body', new BoxGeometry(1.8, 0.6, 3.5))
    this.cache.set('blue-car-windshield', new BoxGeometry(1.4, 0.4, 1.2))

    // Rocket launcher geometries
    this.cache.set('launcher-base', new CylinderGeometry(0.8, 0.8, 0.2))
    this.cache.set('launcher-body', new BoxGeometry(1.2, 0.8, 1.4))
    this.cache.set('launcher-tube', new CylinderGeometry(0.12, 0.12, 0.6))
    this.cache.set('launcher-light', new SphereGeometry(0.08))
    this.cache.set('launcher-glow', new SphereGeometry(0.3))

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