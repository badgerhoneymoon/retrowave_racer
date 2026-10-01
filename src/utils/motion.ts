// Match the old 60 Hz chase's 8.1-unit lag at 54 units/sec.
export const FOLLOW_RATE = 60 * 0.1 / 0.9

// Exact exponential follow of a target moving linearly over this frame.
// Unlike lerp-to-current-target, its lag does not change with frame cadence.
export function followMovingTarget(value: number, previousTarget: number, target: number, delta: number): number {
  if (delta <= 0) return value
  const step = FOLLOW_RATE * delta
  const alpha = -Math.expm1(-step)
  return value + (previousTarget - value) * alpha + (target - previousTarget) * (1 - alpha / step)
}

// Carry the chase camera with the car, then ease its relative offset. Speed
// cannot accumulate extra trailing distance, including during boost/braking.
export function followCarOffset(value: number, previousTarget: number, target: number, delta: number): number {
  const carried = value + target - previousTarget
  if (delta <= 0) return carried
  return target + (carried - target) * Math.exp(-FOLLOW_RATE * delta)
}

export interface WorldPositionRef {
  current: { x: number; z: number }
}
