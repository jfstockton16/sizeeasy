'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeftRight,
  Share2,
  Download,
  Heart,
  Maximize2,
  Grid3x3,
  Layers,
  Lightbulb,
  Box,
  Camera,
  X,
} from 'lucide-react'
import {
  SizeObject,
  calculateSizeRatio,
  formatImperialHeight,
  formatImperialWeight,
  metersToFeet,
  getObjectEmoji
} from '@/lib/objects'
import { useComparisonStore } from '@/lib/store'
import dynamic from 'next/dynamic'
import ComparisonARViewer from './ComparisonARViewer'

// Dynamically import 3D viewer to avoid SSR issues with Three.js
const Comparison3DViewer = dynamic(() => import('./Comparison3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px]">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <div className="text-lg font-semibold">Loading 3D Engine...</div>
      </div>
    </div>
  ),
})

interface ComparisonViewerProps {
  object1: SizeObject
  object2: SizeObject
}

export default function ComparisonViewer({ object1, object2 }: ComparisonViewerProps) {
  const { viewMode, setViewMode, swapObjects } = useComparisonStore()
  const [liked, setLiked] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showAR, setShowAR] = useState(false)

  const comparison = calculateSizeRatio(object1, object2)

  // Calculate scaled dimensions for visualization
  const getScaledDimensions = (obj: SizeObject) => {
    const baseSize = 100 // Base size in pixels for 1 meter
    const maxHeight = 400 // Maximum height for visualization

    const height = obj.height || obj.length || 1
    const scaledHeight = Math.min(height * baseSize, maxHeight)

    return {
      height: scaledHeight,
      scale: scaledHeight / 100, // Scale factor relative to base
    }
  }

  const obj1Dims = getScaledDimensions(object1)
  const obj2Dims = getScaledDimensions(object2)

  // Generate mind-blowing facts
  const generateQuirkyFacts = () => {
    const facts = []
    const ratio = comparison.ratio

    // Get the larger and smaller objects for comparisons
    const largerObj = comparison.ratio > 1 ? object1 : object2
    const smallerObj = comparison.ratio > 1 ? object2 : object1
    const actualRatio = Math.max(ratio, 1 / ratio)

    // Epic height comparisons
    if (object1.height || object1.length) {
      const heightMeters = object1.height || object1.length || 0
      const heightFeet = metersToFeet(heightMeters)

      // Statue of Liberty comparison
      const statueHeight = 305 // feet (with pedestal)
      if (heightFeet > 100) {
        const statues = (heightFeet / statueHeight).toFixed(1)
        if (parseFloat(statues) > 0.5) {
          facts.push(`🗽 Standing at ${formatImperialHeight(heightMeters)}, that's ${statues} Statues of Liberty stacked up!`)
        }
      }

      // Basketball court comparison
      const courtLength = 94 // feet
      if (heightMeters > 10) {
        const courts = (heightFeet / courtLength).toFixed(1)
        facts.push(`🏀 Laid end to end, you'd need ${courts} basketball courts to match this length!`)
      }

      // School bus comparison
      const busLength = 35 // feet
      if (heightFeet > 20) {
        const buses = Math.round(heightFeet / busLength)
        facts.push(`🚌 That's roughly ${buses} school buses lined up bumper to bumper!`)
      }
    }

    // Mind-blowing weight comparisons
    if (object1.weight) {
      const weightLbs = object1.weight * 2.20462

      // Car comparison
      const carWeight = 4000 // lbs
      if (weightLbs > carWeight) {
        const cars = Math.round(weightLbs / carWeight)
        facts.push(`🚗 Weighing ${formatImperialWeight(object1.weight)}, that's ${cars.toLocaleString()} cars worth of mass!`)
      }

      // Elephant comparison
      const elephantWeight = 13000 // lbs
      if (weightLbs > elephantWeight / 2) {
        const elephants = (weightLbs / elephantWeight).toFixed(1)
        facts.push(`🐘 That's the same weight as ${elephants} African elephants!`)
      }
    }

    // Stacking drama
    if (actualRatio > 2) {
      const count = Math.floor(actualRatio)
      if (count > 10) {
        facts.push(`💥 Mind-blowing: You'd need to stack ${count.toLocaleString()} ${smallerObj.name}s to reach the ${comparison.dimension} of just ONE ${largerObj.name}!`)
      } else {
        facts.push(`📏 Stack ${count} ${smallerObj.name}s together to match ONE ${largerObj.name}'s ${comparison.dimension}!`)
      }
    }

    // Extreme size difference
    if (actualRatio > 50) {
      facts.push(`🤯 The size difference is EXTREME - imagine comparing a marble to a beach ball, then multiply that by ${Math.floor(actualRatio / 10)}!`)
    }

    return facts
  }

  const quirkyFacts = generateQuirkyFacts()

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${object1.name} vs ${object2.name}`,
        text: comparison.comparison,
        url: window.location.href,
      })
    } else {
      setShowShare(true)
    }
  }

  const handleDownload = () => {
    // TODO: Implement image download
    alert('Download feature coming soon!')
  }

  return (
    <div className="space-y-6">
      {/* View Mode Selector */}
      <div className="flex items-center justify-between glass rounded-xl p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-brand-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden sm:inline">Side by Side</span>
            <span className="sm:hidden">Side</span>
          </button>
          <button
            onClick={() => setViewMode('overlay')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              viewMode === 'overlay'
                ? 'bg-brand-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">Overlay</span>
          </button>
          <button
            onClick={() => setViewMode('scale')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              viewMode === 'scale'
                ? 'bg-brand-500 text-white'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">To Scale</span>
            <span className="sm:hidden">Scale</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              viewMode === '3d'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Box className="w-4 h-4" />
            <span className="font-semibold">3D</span>
            <span className="text-xs bg-yellow-400 text-black px-1.5 py-0.5 rounded-full ml-1">NEW</span>
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAR(true)}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg flex items-center gap-2 hover:shadow-lg transition-all hover:scale-105"
            title="View in AR"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline font-semibold">AR</span>
            <span className="text-xs bg-white text-green-600 px-1.5 py-0.5 rounded-full ml-1 hidden sm:inline">HOT</span>
          </button>

          <button
            onClick={swapObjects}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
            title="Swap objects"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="glass rounded-2xl p-8 min-h-[500px]">
        {viewMode === 'side-by-side' && (
          <div className="flex items-end justify-center gap-12 h-[450px]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center"
            >
              <div
                className="relative bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 rounded-3xl mb-4 flex items-center justify-center text-white font-bold shadow-2xl overflow-hidden border-4 border-brand-300/50"
                style={{
                  width: `${Math.min(obj1Dims.scale * 80, 200)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-400/50 via-transparent to-brand-600/50 animate-pulse" />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '15px 15px'
                }} />

                <div className="text-center p-4 relative z-10 flex flex-col items-center justify-center h-full">
                  <div className="text-7xl mb-3 drop-shadow-lg">{getObjectEmoji(object1)}</div>
                  <div className="text-sm font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {object1.name}
                  </div>
                </div>

                {/* Enhanced shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50" />

                {/* Glowing edge effect */}
                <div className="absolute inset-0 shadow-inner shadow-brand-300/50" />
              </div>
              <div className="text-center bg-brand-50 dark:bg-brand-900/20 rounded-xl p-3 min-w-[160px]">
                <div className="font-bold text-lg mb-1">{object1.name}</div>
                <div className="text-sm font-semibold text-brand-600 dark:text-brand-400">
                  {object1.height && formatImperialHeight(object1.height)}
                  {object1.length && !object1.height && formatImperialHeight(object1.length)}
                  {(object1.height || object1.length) && ' tall'}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div
                className="relative bg-gradient-to-br from-purple-500 via-purple-600 to-purple-700 rounded-3xl mb-4 flex items-center justify-center text-white font-bold shadow-2xl overflow-hidden border-4 border-purple-300/50"
                style={{
                  width: `${Math.min(obj2Dims.scale * 80, 200)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-400/50 via-transparent to-purple-600/50 animate-pulse" />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                  backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                  backgroundSize: '15px 15px'
                }} />

                <div className="text-center p-4 relative z-10 flex flex-col items-center justify-center h-full">
                  <div className="text-7xl mb-3 drop-shadow-lg">{getObjectEmoji(object2)}</div>
                  <div className="text-sm font-bold bg-black/20 px-3 py-1 rounded-full backdrop-blur-sm">
                    {object2.name}
                  </div>
                </div>

                {/* Enhanced shine effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent opacity-50" />

                {/* Glowing edge effect */}
                <div className="absolute inset-0 shadow-inner shadow-purple-300/50" />
              </div>
              <div className="text-center bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 min-w-[160px]">
                <div className="font-bold text-lg mb-1">{object2.name}</div>
                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  {object2.height && formatImperialHeight(object2.height)}
                  {object2.length && !object2.height && formatImperialHeight(object2.length)}
                  {(object2.height || object2.length) && ' tall'}
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {viewMode === 'overlay' && (
          <div className="flex items-center justify-center h-[450px]">
            <div className="relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.6, scale: 1 }}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-2xl border-4 border-white/20 overflow-hidden"
                style={{
                  width: `${Math.min(obj1Dims.scale * 80, 200)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)',
                  backgroundSize: '20px 20px'
                }} />
                <div className="text-sm relative z-10">{object1.name}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center text-white font-bold shadow-2xl border-4 border-white/20 overflow-hidden"
                style={{
                  width: `${Math.min(obj2Dims.scale * 80, 200)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)',
                  backgroundSize: '20px 20px'
                }} />
                <div className="text-sm relative z-10">{object2.name}</div>
              </motion.div>
            </div>
          </div>
        )}

        {viewMode === 'scale' && (
          <div className="flex items-end justify-center gap-8 h-[450px]">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col items-center"
            >
              <div
                className="relative bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl mb-4 flex items-center justify-center text-white font-bold shadow-2xl overflow-hidden border-4 border-white/20"
                style={{
                  width: `${Math.min(obj1Dims.scale * 100, 300)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)',
                  backgroundSize: '20px 20px'
                }} />
                {obj1Dims.height > 100 && <div className="text-sm p-2 relative z-10">{object1.name}</div>}
              </div>
              <div className="text-sm font-semibold">{object1.name}</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center"
            >
              <div
                className="relative bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl mb-4 flex items-center justify-center text-white font-bold shadow-2xl overflow-hidden border-4 border-white/20"
                style={{
                  width: `${Math.min(obj2Dims.scale * 100, 300)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                <div className="absolute inset-0 opacity-10" style={{
                  backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .3) 25%, rgba(255, 255, 255, .3) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .3) 75%, rgba(255, 255, 255, .3) 76%, transparent 77%, transparent)',
                  backgroundSize: '20px 20px'
                }} />
                {obj2Dims.height > 100 && <div className="text-sm p-2 relative z-10">{object2.name}</div>}
              </div>
              <div className="text-sm font-semibold">{object2.name}</div>
            </motion.div>
          </div>
        )}

        {viewMode === '3d' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="-m-8"
          >
            <Comparison3DViewer object1={object1} object2={object2} />
          </motion.div>
        )}
      </div>

      {/* Comparison Info */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-2xl font-bold mb-4 text-center">{comparison.comparison}</h3>

        {quirkyFacts.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <span className="font-semibold text-yellow-800 dark:text-yellow-200">
                Fun Facts:
              </span>
            </div>
            <ul className="space-y-1 text-sm text-yellow-900 dark:text-yellow-100">
              {quirkyFacts.map((fact, index) => (
                <li key={index}>• {fact}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-brand-50 dark:bg-brand-900/20 rounded-lg p-4">
            <div className="font-semibold text-brand-600 dark:text-brand-400 mb-2 flex items-center gap-2">
              <span className="text-2xl">{getObjectEmoji(object1)}</span>
              {object1.name}
            </div>
            <div className="space-y-1 text-sm font-medium">
              {object1.height && <div>Height: {formatImperialHeight(object1.height)}</div>}
              {object1.length && <div>Length: {formatImperialHeight(object1.length)}</div>}
              {object1.weight && <div>Weight: {formatImperialWeight(object1.weight)}</div>}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
              <span className="text-2xl">{getObjectEmoji(object2)}</span>
              {object2.name}
            </div>
            <div className="space-y-1 text-sm font-medium">
              {object2.height && <div>Height: {formatImperialHeight(object2.height)}</div>}
              {object2.length && <div>Length: {formatImperialHeight(object2.length)}</div>}
              {object2.weight && <div>Weight: {formatImperialWeight(object2.weight)}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => setLiked(!liked)}
          className={`flex-1 py-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all ${
            liked
              ? 'bg-pink-500 text-white shadow-lg scale-105'
              : 'glass hover:shadow-lg hover:scale-105'
          }`}
        >
          <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          {liked ? 'Liked!' : 'Like'}
        </button>

        <button
          onClick={handleShare}
          className="flex-1 py-4 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
        >
          <Share2 className="w-5 h-5" />
          Share
        </button>

        <button
          onClick={handleDownload}
          className="flex-1 py-4 glass rounded-xl font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
      </div>

      {/* Share Modal */}
      {showShare && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowShare(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="glass rounded-2xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-4">Share this comparison</h3>
            <div className="space-y-3">
              <button className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Share on Twitter
              </button>
              <button className="w-full py-3 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors">
                Share on Facebook
              </button>
              <button className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-opacity">
                Share on Instagram
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }}
                className="w-full py-3 glass rounded-lg hover:shadow-lg transition-all"
              >
                Copy Link
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* AR Modal */}
      {showAR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAR(false)}
        >
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              <button
                onClick={() => setShowAR(false)}
                className="absolute -top-4 -right-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-full shadow-lg hover:shadow-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
              <ComparisonARViewer
                object1={object1}
                object2={object2}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
