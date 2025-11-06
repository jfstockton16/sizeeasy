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
} from 'lucide-react'
import { SizeObject, calculateSizeRatio } from '@/lib/objects'
import { useComparisonStore } from '@/lib/store'
import dynamic from 'next/dynamic'

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

  // Generate quirky equivalents
  const generateQuirkyFacts = () => {
    const facts = []
    const ratio = comparison.ratio

    // Banana comparison (because internet)
    const bananaLength = 0.18 // meters
    if (object1.height || object1.length) {
      const size = object1.height || object1.length || 0
      const bananas = Math.round(size / bananaLength)
      facts.push(`${object1.name} is about ${bananas.toLocaleString()} bananas ${comparison.dimension}!`)
    }

    // Football field comparison
    const footballField = 109.7 // meters
    if (object1.length && object1.length > 50) {
      const fields = (object1.length / footballField).toFixed(2)
      facts.push(`That's ${fields} football fields!`)
    }

    // Stacking comparison
    if (ratio > 2) {
      const count = Math.floor(ratio)
      facts.push(`You could stack ${count} ${object2.name}s to match one ${object1.name}`)
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
                className="bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj1Dims.scale * 80, 200)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                <div className="text-center p-4">
                  <div className="text-2xl mb-2">📏</div>
                  <div className="text-sm">{object1.name}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{object1.name}</div>
                <div className="text-sm text-gray-500">
                  {object1.height && `${object1.height}m tall`}
                  {object1.length && !object1.height && `${object1.length}m long`}
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
                className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj2Dims.scale * 80, 200)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                <div className="text-center p-4">
                  <div className="text-2xl mb-2">📐</div>
                  <div className="text-sm">{object2.name}</div>
                </div>
              </div>
              <div className="text-center">
                <div className="font-bold text-lg">{object2.name}</div>
                <div className="text-sm text-gray-500">
                  {object2.height && `${object2.height}m tall`}
                  {object2.length && !object2.height && `${object2.length}m long`}
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
                className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj1Dims.scale * 80, 200)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                <div className="text-sm">{object1.name}</div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.9, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="relative bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj2Dims.scale * 80, 200)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                <div className="text-sm">{object2.name}</div>
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
                className="bg-gradient-to-br from-brand-400 to-brand-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj1Dims.scale * 100, 300)}px`,
                  height: `${obj1Dims.height}px`,
                }}
              >
                {obj1Dims.height > 100 && <div className="text-sm p-2">{object1.name}</div>}
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
                className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg mb-4 flex items-center justify-center text-white font-bold shadow-xl"
                style={{
                  width: `${Math.min(obj2Dims.scale * 100, 300)}px`,
                  height: `${obj2Dims.height}px`,
                }}
              >
                {obj2Dims.height > 100 && <div className="text-sm p-2">{object2.name}</div>}
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
            <div className="font-semibold text-brand-600 dark:text-brand-400 mb-2">
              {object1.name}
            </div>
            <div className="space-y-1 text-sm">
              {object1.height && <div>Height: {object1.height}m</div>}
              {object1.length && <div>Length: {object1.length}m</div>}
              {object1.weight && <div>Weight: {object1.weight.toLocaleString()}kg</div>}
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="font-semibold text-purple-600 dark:text-purple-400 mb-2">
              {object2.name}
            </div>
            <div className="space-y-1 text-sm">
              {object2.height && <div>Height: {object2.height}m</div>}
              {object2.length && <div>Length: {object2.length}m</div>}
              {object2.weight && <div>Weight: {object2.weight.toLocaleString()}kg</div>}
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
    </div>
  )
}
