import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  AdditiveBlending,
  BackSide,
  BufferGeometry,
  BufferAttribute,
  Group,
  Points,
  PointsMaterial,
  ShaderMaterial,
} from 'three'

const SKY_RADIUS = 380

// Deterministic pseudo-random so the star field is stable across frames/renders
function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

const skyVertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const skyFragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vDir;

  // Cheap value-noise fbm for drifting nebula clouds
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 4; i++) {
      v += a * vnoise(p);
      p *= 2.1;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec3 dir = normalize(vDir);

    // Palette
    vec3 zenith  = vec3(0.027, 0.008, 0.075);  // #070213 deep space indigo
    vec3 mid     = vec3(0.165, 0.039, 0.290);  // #2a0a4a violet
    vec3 horizon = vec3(1.000, 0.176, 0.471);  // #ff2d78 hot pink
    vec3 ground  = vec3(0.086, 0.020, 0.153);  // #160527 haze below horizon

    float h = dir.y;

    // Vertical gradient
    vec3 sky = mix(mid, zenith, smoothstep(0.06, 0.65, h));
    sky = mix(horizon * 0.85, sky, smoothstep(-0.02, 0.22, h));

    // Sun-side glow: strongest looking toward -Z where the sun sits
    float sunFacing = smoothstep(-0.2, 1.0, -dir.z);
    float band = exp(-abs(h - 0.015) * 9.0);
    sky += horizon * band * (0.25 + 0.6 * sunFacing);

    // Warm tinge right at the horizon line on the sun side
    vec3 warm = vec3(1.0, 0.45, 0.15);
    sky += warm * exp(-abs(h - 0.01) * 26.0) * sunFacing * 0.3;

    // Drifting nebula clouds in the mid/upper sky — project direction on a
    // plane for stable mapping, two layers at parallax scales
    if (h > 0.04) {
      vec2 np = dir.xz / (dir.y + 0.35);
      float clouds = fbm(np * 1.6 + vec2(uTime * 0.008, uTime * 0.003));
      float wisps  = fbm(np * 3.4 - vec2(uTime * 0.005, uTime * 0.011));
      float neb = smoothstep(0.45, 0.85, clouds * 0.7 + wisps * 0.3);
      vec3 nebulaCol = mix(vec3(0.48, 0.16, 0.75), vec3(1.0, 0.24, 0.55), wisps);
      sky += nebulaCol * neb * 0.22 * smoothstep(0.04, 0.35, h) * (1.0 - sunFacing * 0.4);
    }

    // Below the horizon: fade to ground haze
    sky = mix(sky, ground, smoothstep(-0.02, -0.25, h));

    gl_FragColor = vec4(sky, 1.0);
  }
`

function Sky() {
  const groupRef = useRef<Group>(null)
  const starsRef = useRef<Points>(null)

  const skyMaterial = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertexShader,
        fragmentShader: skyFragmentShader,
        uniforms: {
          uTime: { value: 0 },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    []
  )

  const starGeometry = useMemo(() => {
    const STAR_COUNT = 900
    const geo = new BufferGeometry()
    const positions = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      // Random direction biased to the upper hemisphere
      const theta = seededRandom(i * 3 + 1) * Math.PI * 2
      const y = 0.04 + seededRandom(i * 3 + 2) * 0.96
      const r = Math.sqrt(Math.max(0, 1 - y * y))
      const radius = SKY_RADIUS - 10
      positions[i * 3] = Math.cos(theta) * r * radius
      positions[i * 3 + 1] = y * radius
      positions[i * 3 + 2] = Math.sin(theta) * r * radius
    }
    geo.setAttribute('position', new BufferAttribute(positions, 3))
    return geo
  }, [])

  const starMaterial = useMemo(
    () =>
      new PointsMaterial({
        color: '#cfe8ff',
        size: 1.5,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
        blending: AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    []
  )

  useFrame(({ camera, clock }) => {
    // The dome always surrounds the camera
    if (groupRef.current) {
      groupRef.current.position.copy(camera.position)
    }
    skyMaterial.uniforms.uTime.value = clock.elapsedTime
    // Gentle star twinkle via global opacity pulse
    if (starsRef.current) {
      const t = clock.elapsedTime
      starMaterial.opacity = 0.65 + 0.25 * Math.sin(t * 0.8)
    }
  })

  return (
    <group ref={groupRef} renderOrder={-10}>
      <mesh material={skyMaterial} frustumCulled={false}>
        <sphereGeometry args={[SKY_RADIUS, 32, 24]} />
      </mesh>
      <points ref={starsRef} geometry={starGeometry} material={starMaterial} frustumCulled={false} />
    </group>
  )
}

export default Sky
