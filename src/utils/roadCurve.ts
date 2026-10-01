// ---------------------------------------------------------------------------
// Road curvature — single source of truth for the road's centerline.
// The road center sways as a function of world Z: two layered sines give
// long sweeping bends with occasional tighter esses. Everything that lives
// "on the road" (car clamp, obstacle lanes, rails, dashes, sun) derives its
// X from roadCenterAt(z) so the whole world bends consistently.
// ---------------------------------------------------------------------------

export const CURVE_A1 = 15   // primary sweep amplitude (units)
export const CURVE_F1 = 0.0055 // primary sweep frequency (~1140u wavelength)
export const CURVE_A2 = 5.5  // secondary sweep amplitude
export const CURVE_F2 = 0.016  // secondary sweep frequency (~390u wavelength)

export const ROAD_HALF_WIDTH = 19 // half-width of the drivable surface

// X coordinate of the road centerline at a given world Z
export function roadCenterAt(z: number): number {
  return CURVE_A1 * Math.sin(z * CURVE_F1) + CURVE_A2 * Math.sin(z * CURVE_F2)
}

// Approximate yaw of the road direction at z (radians, small).
// Positive = the road ahead bends toward -X.
export function roadYawAt(z: number): number {
  const behind = roadCenterAt(z + 2)
  const ahead = roadCenterAt(z - 6)
  return Math.atan2(behind - ahead, 8)
}
