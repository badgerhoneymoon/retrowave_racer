# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a 3D synthwave-style racing game called "Synthwave Racer" built with React, TypeScript, and Three.js using React Three Fiber. The game features a cyberpunk aesthetic with neon grid roads and a controllable car.

## NEVER RUN Development Commands (USER DOES IT)

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## Architecture

### Core Structure
- **Entry Point**: `src/main.tsx` → `src/App.tsx` 
- **3D Scene**: Managed by React Three Fiber Canvas in App.tsx
- **Game Components**: Located in `src/components/`
  - `Scene.tsx` - Main 3D scene with lighting setup and weapon systems
  - `Car.tsx` - Player vehicle with physics, controls, and weapon firing
  - `SmoothRoad.tsx` - Animated grid road with synthwave styling
  - `ObstacleManager.tsx` - Spawns and manages road obstacles and pickups
  - **Weapons System**:
    - `PlasmaProjectile.tsx` - Standard projectiles with collision detection
    - `AreaMissile.tsx` - Area-of-effect missiles with physics simulation
    - `MissileExplosion.tsx` - Large explosion effects for missile impacts
    - `ExplosionEffect.tsx` - Standard explosion effects for projectile hits
- **Hooks**: `src/hooks/useKeyboard.ts` - Keyboard input handling (currently unused)

### Key Technologies
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Three.js utilities (OrbitControls)
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety with strict configuration

### Game Controls
The car is controlled via keyboard in `Car.tsx`:
- Arrow keys or WASD for movement
- **Space** - Fire plasma projectiles (normal and spread shot modes)
- **M key** - Fire area-of-effect missiles (limited to 5 per rocket launcher pickup)
- Physics simulation with velocity, friction, and boundaries
- Car movement is bounded to road width (-8 to 8 on X-axis)

### Visual Style
- Dark cyberpunk theme (#0a0a0a background)
- Neon colors: magenta (#ff00ff), cyan (#00ffff), orange (#ff6600) 
- Animated grid road that scrolls continuously
- Multiple colored lights for atmospheric effect

### Notable Implementation Details
- Car physics are handled in useFrame hook with delta time
- Road grid animation uses modulo for seamless looping
- Keyboard event listeners are managed directly in Car component (not using the useKeyboard hook)
- TypeScript strict mode enabled with unused parameter/variable checking

### CRITICAL: Coordinate System
- **Car Movement**: Car moves in NEGATIVE Z direction when going forward (z = 0 → z = -100 → z = -200)
- **Obstacle Generation**: Must generate obstacles at MORE NEGATIVE Z values to be ahead of car
- **Ahead = More Negative Z**: To place obstacles ahead of car at z = -100, generate at z = -150, z = -200, etc.
- **Behind = More Positive Z**: Obstacles behind car at z = -100 would be at z = -50, z = 0, etc.
- **Example**: Car at z = -100 → obstacles ahead from z = -400 to z = -120, obstacles behind from z = -80 to z = -50

## Code Organization Guidelines

- **File Size Limit**: Avoid having more than 400 lines inside one file
- **Separation of Concerns**: Consistently separate logic into:
  - Helper files for utility functions
  - Utils for shared business logic
  - Components for UI/rendering logic
  - Hooks for reusable state/effect logic
- **Modular Architecture**: Break down complex components into smaller, focused modules

## Code Quality Requirements

- **ALWAYS run TypeScript check after code changes**: `npx tsc --noEmit`
- **NEVER RUN ESLINT** - NO LINT SCRIPT EXISTS IN THIS PROJECT
- **Fix all TypeScript errors immediately** - never leave broken code
- **Remove unused imports** - use only what's needed (React import often not needed with modern JSX transform)
- **Verify all exports/imports** - ensure functions are properly exported from utils

### Current Status
- ✅ TypeScript: Configured and working
- ❌ ESLint: NOT CONFIGURED - DO NOT ATTEMPT TO RUN LINT

### Available Commands
- `npx tsc --noEmit` - Run TypeScript type checking
- **NO LINT COMMANDS AVAILABLE**

### Additional Testing Required
**Domain-Specific Runtime Errors** (not caught by static analysis):
- **React Three Fiber Context Violations**: HTML elements inside `<Canvas>` 
- **Three.js Property Misuse**: Invalid Three.js object configurations
- **Performance Issues**: Object creation in frame loops

**Recommended Additional Checks:**
1. **Manual Browser Testing**: Always test new components in browser
2. **Console Error Monitoring**: Watch for R3F runtime errors
3. **Performance Profiling**: Check frame rates with Three.js dev tools

**Common R3F Pitfalls to Watch:**
- ❌ `<div>` inside `<Canvas>` → Move HTML outside Canvas
- ❌ `new Vector3()` in `useFrame` → Create outside loop
- ❌ Object cloning in render loop → Use refs for persistence

## Weapon Systems

### Pickup Types
- **Yellow Rewards** (`type: 'reward'`) - 100 points, creates explosion effect
- **Green Cones** (`type: 'cone'`) - Speed boost items, stacks up to 2.0x multiplier
- **Blue Cars** (`type: 'car'`) - Moving obstacles with collision physics
- **Rocket Launcher** (`type: 'rocket_launcher'`) - Rare pickup (3% spawn rate) gives 5 missiles

### Missile System
- **Firing**: M key fires area-of-effect missiles (2 second cooldown)
- **Physics**: Missiles have gravity, travel in arcs, explode on ground contact
- **Area Damage**: 8-unit explosion radius destroys all cars in range
- **Scoring**: 25 points per car destroyed by missile (vs 10 for plasma projectiles)
- **Visual**: Large explosion with shockwave, multiple particle effects
- **Limitation**: Maximum 5 missiles per rocket launcher pickup, max 3 active simultaneously

### Collision System (`src/utils/collision.ts`)
- **Types**: Supports `'reward' | 'cone' | 'car' | 'rocket_launcher'`
- **Detection**: AABB collision detection with type-specific bounding boxes
- **Results**: Returns collision flags: `isBoost`, `isReward`, `isRocketLauncher`

## Performance Optimization Rules ⚡

**CRITICAL**: Apply these performance best practices to ALL new components and features from the start!

### React Performance Rules
- **ALWAYS use React.memo** for pure display components (components that only depend on props)
- **NEVER setState in useFrame** - use refs instead for values that change every frame
- **Memoize expensive calculations** with useMemo (materials, trigonometry, etc.)
- **Pre-compute static values** - sin/cos, material instances, geometry, etc.
- **Minimize parent re-renders** - avoid unnecessary callback props, use refs for communication

### Three.js Performance Rules
- **Reuse Vector3 instances** - create module-level scratch vectors, never `vector.clone()` in loops
- **Memoize materials** - use useMemo for materials that depend on state changes
- **Pool objects** - reuse geometries, materials, and meshes when possible
- **Avoid console.log in loops** - causes frame spikes in development builds
- **Throttle material updates** - opacity/color changes don't need 60fps, use every 3rd frame

### Frame Loop Optimization
- **Gate expensive operations** - only run collision detection, array filtering when needed
- **Use dirty flags** - track when updates are actually required vs running every frame
- **Batch DOM updates** - for UI elements, update directly instead of React state
- **Prefer refs over state** - for values that change frequently (position, velocity, etc.)

### Component Architecture Rules
- **Separate concerns**: Logic components vs Display components vs Effect components
- **Keep components under 400 lines** - break into smaller focused modules
- **Export utilities separately** - collision, math, generation functions in utils/
- **Use proper dependency arrays** - for useMemo, useEffect, useCallback

### Examples to Follow
```typescript
// ✅ GOOD: Memoized material
const material = useMemo(() => (
  <meshStandardMaterial color={getColor()} />
), [state1, state2])

// ✅ GOOD: Scratch vector reuse
const SCRATCH_VECTOR = new Vector3()
// In useFrame:
position.add(SCRATCH_VECTOR.copy(velocity).multiplyScalar(delta))

// ✅ GOOD: Ref for frame values
const speedRef = useRef(0)
// In useFrame: speedRef.current += acceleration * delta

// ✅ GOOD: Gated expensive operations
if (Math.abs(carZ - lastCarZ.current) > 10) {
  updateObstacles() // Only when car moved significantly
}

// ❌ BAD: State in useFrame
const [speed, setSpeed] = useState(0)
// In useFrame: setSpeed(prev => prev + acceleration * delta)

// ❌ BAD: Clone in loops
velocity.clone().multiplyScalar(delta) // Creates garbage every frame

// ❌ BAD: Material recreation
<meshStandardMaterial color={isDynamic ? '#ff0000' : '#00ff00'} />
```

### Testing Requirements
After implementing any performance-sensitive feature:
1. **Run TypeScript check**: `npx tsc --noEmit`
2. **Test frame rate** during intense gameplay (multiple explosions, many obstacles)
3. **Monitor console** for warnings or errors during development
4. **Verify memory usage** doesn't grow over time during extended play

## Memories
- NEVER RUN LINT - NO LINT SCRIPT EXISTS