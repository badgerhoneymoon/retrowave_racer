import { memo } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Environment, OrbitControls } from '@react-three/drei'
import ProofCar from './ProofCar'
import ProofRoad from './ProofRoad'
import FpsProbe from '../components/FpsProbe'

export default memo(function ProofScene({ before }: { before: boolean }) {
  // The existing statistics probe uses priority 2, which owns R3F's loop.
  // Render explicitly at priority 1 so measurements include the real frame.
  useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1)
  return <>
    <Environment files="/hdri/venice_sunset_2k.hdr" background backgroundBlurriness={0.08} environmentIntensity={0.85} environmentRotation={[0, 1.1, 0]} backgroundRotation={[0, 1.1, 0]} />
    <fog attach="fog" args={['#bdaaa1', 32, 100]} />
    <directionalLight position={[-8, 7, -12]} color="#ffd5b1" intensity={2.7} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.00012} shadow-normalBias={0.02} shadow-camera-left={-7} shadow-camera-right={7} shadow-camera-top={7} shadow-camera-bottom={-7} shadow-camera-near={0.5} shadow-camera-far={40} />
    <ProofRoad />
    <ProofCar before={before} />
    <ContactShadows position={[0, 0, 0]} scale={12} opacity={0.6} blur={2.3} far={2.3} resolution={512} frames={2} />
    <OrbitControls target={[0, 0.68, 0]} minDistance={5} maxDistance={15} minPolarAngle={0.5} maxPolarAngle={Math.PI / 2 - 0.025} enablePan={false} />
    <FpsProbe />
  </>
})
