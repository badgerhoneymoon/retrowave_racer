import { useRef, memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial } from 'three'
import * as THREE from 'three'
import { CURVE_A1, CURVE_F1, CURVE_A2, CURVE_F2 } from '../utils/roadCurve'

const TAU = Math.PI * 2

interface SmoothRoadProps {
  carZ?: number
  carX?: number
}

function SmoothRoad({ carZ = 0, carX = 0 }: SmoothRoadProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (materialRef.current) {
      // Update shader uniforms for pattern scroll + pulse + curve phase.
      // Phases are computed CPU-side in double precision and wrapped to [0, 2π)
      // so the GLSL sine arguments stay small no matter how far you drive.
      materialRef.current.uniforms.uCarZ.value = carZ
      materialRef.current.uniforms.uCarX.value = carX
      materialRef.current.uniforms.uTime.value = clock.elapsedTime
      const phase = materialRef.current.uniforms.uCurvePhase.value as THREE.Vector2
      phase.set(
        ((carZ * CURVE_F1) % TAU + TAU) % TAU,
        ((carZ * CURVE_F2) % TAU + TAU) % TAU
      )
    }

    if (meshRef.current) {
      // Move the road plane to follow the car so it never ends
      meshRef.current.position.z = carZ
    }
  })

  const vertexShader = /* glsl */ `
    varying vec3 vWorldPosition;

    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `

  const fragmentShader = /* glsl */ `
    uniform float uCarZ;
    uniform float uCarX;
    uniform float uTime;
    uniform vec2 uCurvePhase;
    varying vec3 vWorldPosition;

    void main() {
      vec2 wp = vWorldPosition.xz;

      // World-stable pattern coordinate: local offset + wrapped car phase.
      // (mod 200 keeps float precision healthy on endless runs; grid spacing divides 200)
      float zPat = (wp.y - uCarZ) + mod(uCarZ, 200.0);
      vec2 pat = vec2(wp.x, zPat);

      float dist = length(vWorldPosition - cameraPosition);
      vec3 fogColor = vec3(0.086, 0.020, 0.153); // #160527
      float fogF = smoothstep(80.0, 250.0, dist);

      // Road centerline curves with Z — phases arrive pre-wrapped from the CPU
      float localZ = wp.y - uCarZ;
      float center = ${CURVE_A1.toFixed(4)} * sin(${CURVE_F1.toFixed(6)} * localZ + uCurvePhase.x)
                   + ${CURVE_A2.toFixed(4)} * sin(${CURVE_F2.toFixed(6)} * localZ + uCurvePhase.y);
      float rx = wp.x - center; // lateral offset from the road centerline
      float ax = abs(rx);
      float roadHalf = 19.0;
      float onRoad = 1.0 - smoothstep(roadHalf - 0.5, roadHalf + 0.5, ax);

      // ---------- Off-road synthwave grid ----------
      vec2 g2 = abs(fract(pat / 2.0 - 0.5) - 0.5) / fwidth(pat / 2.0);
      float minor = 1.0 - min(min(g2.x, g2.y), 1.0);
      vec2 g10 = abs(fract(pat / 10.0 - 0.5) - 0.5) / fwidth(pat / 10.0);
      float major = 1.0 - min(min(g10.x, g10.y), 1.0);

      // Energy pulse streaming toward the horizon (frequency wraps exactly every 200u)
      float pulse = 0.7 + 0.3 * sin(zPat * 0.0628 - uTime * 2.2);

      vec3 gridGlow = vec3(1.0, 0.17, 0.84) * (minor * 0.35 + major * 0.85) * pulse;
      vec3 groundBase = vec3(0.047, 0.012, 0.090);
      vec3 ground = groundBase + gridGlow * (1.0 - fogF * 0.7);

      // ---------- Asphalt ---------- (kept deep-black so ACES can't wash it out)
      vec3 asphalt = vec3(0.016, 0.022, 0.038);
      // faint longitudinal wear streaks for texture (wrap-safe frequency)
      float streak = sin(wp.x * 6.3) * sin(zPat * 0.3456);
      asphalt += vec3(0.009, 0.011, 0.016) * smoothstep(0.2, 1.0, streak);
      // Broad painted-light cues on the existing road shader: no scene capture,
      // extra lights or shadow maps. Keep markings readable under the headlights.
      float forward = uCarZ - wp.y;
      float beamWidth = 1.8 + max(0.0, forward) * 0.13;
      float beam = smoothstep(0.0, 5.0, forward) * (1.0 - smoothstep(18.0, 75.0, forward));
      beam *= 1.0 - smoothstep(beamWidth * 0.3, beamWidth, abs(wp.x - uCarX));
      asphalt += vec3(0.065, 0.082, 0.10) * beam;
      float shoulder = smoothstep(14.5, 15.0, ax);
      asphalt += vec3(0.012, 0.014, 0.022) * shoulder;
      float curb = 1.0 - smoothstep(0.16, 0.32, abs(ax - 17.8));
      vec3 curbColor = mix(vec3(0.28, 0.035, 0.07), vec3(0.42, 0.48, 0.55), step(0.5, fract(zPat / 4.0)));
      asphalt += curbColor * curb * (1.0 - fogF);
      // A restrained horizon reflection adds depth without enabling the costly
      // optional planar reflector. This is an art-direction approximation.
      float horizonSheen = exp(-rx * rx * 0.018) * smoothstep(20.0, 140.0, forward);
      asphalt += vec3(0.065, 0.026, 0.044) * horizonSheen;

      // Lane divider dashes (lanes sit at -12,-6,0,6,12 → dividers at ±3, ±9)
      float dashZ = step(0.5, fract(zPat / 8.0));
      float lane3 = 1.0 - smoothstep(0.10, 0.30, abs(ax - 3.0));
      float lane9 = 1.0 - smoothstep(0.10, 0.30, abs(ax - 9.0));
      float lane = (lane3 + lane9) * dashZ;
      vec3 laneGlow = vec3(0.35, 0.85, 1.0) * lane * 0.6;

      // Neon edge rails: cyan left, magenta right, with a soft halo
      float railCore = exp(-pow((ax - roadHalf) * 2.4, 2.0));
      float railHalo = exp(-pow((ax - roadHalf) * 0.65, 2.0)) * 0.30;
      float railPulse = 0.85 + 0.15 * sin(uTime * 3.0 + rx);
      vec3 railColor = rx < 0.0 ? vec3(0.0, 0.94, 1.0) : vec3(1.0, 0.17, 0.84);
      vec3 rails = railColor * (railCore * 1.7 + railHalo) * railPulse;

      vec3 road = asphalt + laneGlow * (1.0 - fogF) + rails;

      // ---------- Compose ----------
      vec3 color = mix(ground, road, onRoad);

      // Horizon glow bleed right at the vanishing point
      float horizonGlow = smoothstep(140.0, 240.0, dist) * smoothstep(30.0, 0.0, ax);
      color += vec3(1.0, 0.18, 0.47) * horizonGlow * 0.25;

      color = mix(color, fogColor, fogF);
      gl_FragColor = vec4(color, 1.0);
    }
  `

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
    >
      {/* Wide plane: road + neon grid field stretching to the fog */}
      <planeGeometry args={[240, 1000]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uCarZ: { value: 0 },
          uCarX: { value: 0 },
          uTime: { value: 0 },
          uCurvePhase: { value: new THREE.Vector2(0, 0) }
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

export default memo(SmoothRoad)
