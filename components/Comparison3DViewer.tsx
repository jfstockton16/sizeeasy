'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Environment, Grid, Text } from '@react-three/drei'
import { SizeObject } from '@/lib/objects'
import { Suspense } from 'react'
import * as THREE from 'three'

interface Comparison3DViewerProps {
  object1: SizeObject
  object2: SizeObject
}

interface Object3DProps {
  object: SizeObject
  position: [number, number, number]
  color: string
}

function Object3D({ object, position, color }: Object3DProps) {
  // Calculate dimensions (convert meters to units, scale down for better viewing)
  const scale = 0.1 // Scale factor for visualization
  const height = (object.height || object.length || 1) * scale
  const width = (object.width || height * 0.5) * scale
  const depth = (object.length || height * 0.5) * scale

  // Determine shape based on category
  const getShape = () => {
    const category = object.category.toLowerCase()

    if (category.includes('animal')) {
      // Organic ellipsoid shape for animals
      return (
        <group position={position}>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <capsuleGeometry args={[width / 2, height * 0.6, 8, 16]} />
            <meshStandardMaterial
              color={color}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
          {/* Label */}
          <Text
            position={[0, height + 0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {object.name}
          </Text>
        </group>
      )
    } else if (category.includes('building') || category.includes('monument')) {
      // Box shape for buildings
      return (
        <group position={position}>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <boxGeometry args={[width, height, depth]} />
            <meshStandardMaterial
              color={color}
              roughness={0.5}
              metalness={0.3}
            />
          </mesh>
          {/* Windows effect for buildings */}
          {Array.from({ length: Math.floor(height / 0.3) }).map((_, i) => (
            <mesh
              key={i}
              position={[width / 2 + 0.01, (i * 0.3) + 0.2, 0]}
              castShadow
            >
              <planeGeometry args={[0.1, 0.1]} />
              <meshStandardMaterial
                color="#ffffff"
                emissive="#ffff00"
                emissiveIntensity={0.5}
              />
            </mesh>
          ))}
          <Text
            position={[0, height + 0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {object.name}
          </Text>
        </group>
      )
    } else if (category.includes('vehicle')) {
      // Elongated box for vehicles
      return (
        <group position={position}>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <boxGeometry args={[width, height, depth * 1.5]} />
            <meshStandardMaterial
              color={color}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>
          {/* Wheels */}
          <mesh
            castShadow
            receiveShadow
            position={[width / 2, height * 0.2, depth * 0.5]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[height * 0.15, height * 0.15, 0.1, 16]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
          <mesh
            castShadow
            receiveShadow
            position={[-width / 2, height * 0.2, depth * 0.5]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[height * 0.15, height * 0.15, 0.1, 16]} />
            <meshStandardMaterial color="#222222" roughness={0.8} />
          </mesh>
          <Text
            position={[0, height + 0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {object.name}
          </Text>
        </group>
      )
    } else {
      // Default sphere for other objects
      return (
        <group position={position}>
          <mesh castShadow receiveShadow position={[0, height / 2, 0]}>
            <sphereGeometry args={[Math.max(height, width) / 2, 32, 32]} />
            <meshStandardMaterial
              color={color}
              roughness={0.4}
              metalness={0.2}
            />
          </mesh>
          <Text
            position={[0, height + 0.5, 0]}
            fontSize={0.3}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.05}
            outlineColor="#000000"
          >
            {object.name}
          </Text>
        </group>
      )
    }
  }

  return <>{getShape()}</>
}

function Scene({ object1, object2 }: Comparison3DViewerProps) {
  // Calculate max height for camera positioning
  const maxHeight = Math.max(
    (object1.height || object1.length || 1),
    (object2.height || object2.length || 1)
  ) * 0.1

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[5, 3, 5]} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <spotLight
        position={[-10, 10, -5]}
        angle={0.3}
        penumbra={1}
        intensity={0.5}
        castShadow
      />

      {/* Environment */}
      <Environment preset="sunset" />

      {/* Grid floor */}
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#6e6e6e"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#9d4b4b"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* Ground plane for shadows */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <shadowMaterial opacity={0.3} />
      </mesh>

      {/* Objects */}
      <Object3D
        object={object1}
        position={[-2, 0, 0]}
        color="#0ea5e9"
      />
      <Object3D
        object={object2}
        position={[2, 0, 0]}
        color="#a855f7"
      />

      {/* VS Text between objects */}
      <Text
        position={[0, 1, 0]}
        fontSize={0.5}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.1}
        outlineColor="#000000"
      >
        VS
      </Text>
    </>
  )
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-lg font-semibold">Loading 3D Scene...</div>
        <div className="text-sm text-gray-500">Preparing your interactive comparison</div>
      </div>
    </div>
  )
}

export default function Comparison3DViewer({ object1, object2 }: Comparison3DViewerProps) {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 relative">
      {/* Instructions overlay */}
      <div className="absolute top-4 left-4 z-10 glass rounded-lg p-3 text-sm">
        <div className="font-semibold mb-1">🎮 Controls</div>
        <div className="space-y-1 text-xs">
          <div>🖱️ Left Click + Drag: Rotate</div>
          <div>🔍 Scroll: Zoom</div>
          <div>✋ Right Click + Drag: Pan</div>
          <div>📱 Touch: Pinch to zoom</div>
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute top-4 right-4 z-10 glass rounded-lg px-3 py-2 text-xs font-semibold">
        <span className="text-green-400">●</span> 3D Active
      </div>

      <Suspense fallback={<LoadingFallback />}>
        <Canvas shadows>
          <Scene object1={object1} object2={object2} />
        </Canvas>
      </Suspense>
    </div>
  )
}
