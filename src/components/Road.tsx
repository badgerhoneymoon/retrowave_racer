import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'

interface RoadProps {
  carZ?: number
}

function Road({ carZ }: RoadProps) {
  const roadGroupRef = useRef<Group>(null)
  const [roadChunks, setRoadChunks] = useState<number[]>([-100, 0, 100]) // Multiple chunks
  
  const createGridLines = (chunkZ: number) => {
    const lines = []
    const width = 20
    const chunkLength = 100
    const spacing = 2

    // Vertical lines for this chunk
    for (let i = -width; i <= width; i += spacing) {
      lines.push(
        <mesh key={`vertical-${chunkZ}-${i}`} position={[i, -0.01, chunkZ]}>
          <boxGeometry args={[0.1, 0.01, chunkLength]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
      )
    }

    // Horizontal lines for this chunk
    for (let i = chunkZ - chunkLength/2; i <= chunkZ + chunkLength/2; i += spacing) {
      lines.push(
        <mesh key={`horizontal-${chunkZ}-${i}`} position={[0, -0.01, i]}>
          <boxGeometry args={[width * 2, 0.01, 0.1]} />
          <meshBasicMaterial color="#ff00ff" />
        </mesh>
      )
    }

    return lines
  }

  const allGridLines = useMemo(() => {
    return roadChunks.flatMap(chunkZ => createGridLines(chunkZ))
  }, [roadChunks])

  useFrame(() => {
    if (carZ === undefined) return

    const chunkLength = 100

    setRoadChunks(prev => {
      const currentChunkCenter = Math.round(carZ / chunkLength) * chunkLength
      const newChunks = []
      
      // Generate chunks around car position
      for (let offset = -chunkLength; offset <= chunkLength; offset += chunkLength) {
        newChunks.push(currentChunkCenter + offset)
      }
      
      // Only update if chunks changed
      if (JSON.stringify(newChunks.sort()) !== JSON.stringify(prev.sort())) {
        return newChunks
      }
      return prev
    })
  })

  return (
    <group ref={roadGroupRef}>
      {/* Road surface chunks */}
      {roadChunks.map(chunkZ => (
        <mesh key={`road-${chunkZ}`} position={[0, -0.5, chunkZ]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[40, 100]} />
          <meshStandardMaterial color="#111111" />
        </mesh>
      ))}
      
      <group>
        {allGridLines}
      </group>
    </group>
  )
}

export default Road