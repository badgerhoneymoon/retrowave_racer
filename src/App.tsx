import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import HUD from './components/HUD'
import ControlHints from './components/ControlHints'

function App() {

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 75 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <Scene />
      </Canvas>
      <HUD />
      <ControlHints />
    </div>
  )
}

export default App