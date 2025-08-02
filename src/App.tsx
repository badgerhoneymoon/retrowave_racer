import { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import Scene from './components/Scene'
import HUD from './components/HUD'

function App() {
  const [hudData, setHudData] = useState({ speed: 0, isBoosted: false, boostTimeRemaining: 0, score: 0, spreadShotActive: false, spreadShotTimeRemaining: 0, missilesRemaining: 0 })

  const handleHUDUpdate = (newHudData: { speed: number, isBoosted: boolean, boostTimeRemaining: number, score: number, spreadShotActive: boolean, spreadShotTimeRemaining: number, missilesRemaining: number }) => {
    setHudData(newHudData)
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas
        camera={{ position: [0, 5, 10], fov: 75 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <Scene onHUDUpdate={handleHUDUpdate} />
      </Canvas>
      <HUD 
        speed={hudData.speed}
        isBoosted={hudData.isBoosted}
        boostTimeRemaining={hudData.boostTimeRemaining}
        score={hudData.score}
        spreadShotActive={hudData.spreadShotActive}
        spreadShotTimeRemaining={hudData.spreadShotTimeRemaining}
        missilesRemaining={hudData.missilesRemaining}
      />
    </div>
  )
}

export default App