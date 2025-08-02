import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ShaderMaterial } from 'three'
import * as THREE from 'three'

interface SmoothRoadProps {
  carZ?: number
}

function SmoothRoad({ carZ = 0 }: SmoothRoadProps) {
  const materialRef = useRef<ShaderMaterial>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (materialRef.current) {
      // Update shader uniform for grid scrolling
      materialRef.current.uniforms.uCarZ.value = carZ
    }
    
    if (meshRef.current) {
      // Move the road plane to follow the car so it never ends
      meshRef.current.position.z = carZ
    }
  })

  const vertexShader = `
    uniform float uCarZ;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `

  const fragmentShader = `
    uniform float uCarZ;
    varying vec2 vUv;
    varying vec3 vWorldPosition;
    
    void main() {
      // Create infinite grid that moves with car
      vec2 worldPos = vWorldPosition.xz;
      
      // Offset the grid based on car position for infinite scrolling
      worldPos.y = worldPos.y - uCarZ;
      
      // Calculate distance from camera for fading
      float distanceFromCamera = length(vWorldPosition.xyz - cameraPosition);
      
      // Grid spacing (match original 2-unit spacing)
      float gridSize = 2.0;
      vec2 grid = abs(fract(worldPos / gridSize - 0.5) - 0.5) / fwidth(worldPos / gridSize);
      float gridLine = min(grid.x, grid.y);
      
      // Create pink grid lines with proper thickness
      float pinkLine = 1.0 - min(gridLine, 1.0);
      pinkLine = smoothstep(0.0, 0.1, pinkLine);
      
      // Distance-based fading to prevent aliasing
      float fadeDist = 50.0; // Start fading at 50 units
      float maxDist = 100.0;  // Completely faded at 100 units
      float distanceFade = 1.0 - smoothstep(fadeDist, maxDist, distanceFromCamera);
      
      // Apply distance fade to line intensity
      pinkLine *= distanceFade;
      
      // Road surface color (match original)
      vec3 roadColor = vec3(0.067, 0.067, 0.067); // Dark gray #111111
      vec3 lineColor = vec3(1.0, 0.0, 1.0); // Magenta #ff00ff
      
      // Mix road and lines
      vec3 finalColor = mix(roadColor, lineColor, pinkLine * 0.8);
      
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `

  return (
    <mesh 
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]} 
      position={[0, -0.5, 0]}
    >
      {/* Match original road width (40) and extend length for infinite scroll */}
      <planeGeometry args={[40, 1000]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={{
          uCarZ: { value: 0 }
        }}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
      />
    </mesh>
  )
}

export default SmoothRoad