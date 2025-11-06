'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Camera, Smartphone, Info } from 'lucide-react'
import { SizeObject } from '@/lib/objects'

interface ComparisonARViewerProps {
  object1: SizeObject
  object2: SizeObject
  onClose: () => void
}

export default function ComparisonARViewer({ object1, object2, onClose }: ComparisonARViewerProps) {
  const [isARSupported, setIsARSupported] = useState(false)
  const [showInstructions, setShowInstructions] = useState(true)

  useEffect(() => {
    // Check if AR is supported (iOS Safari 12+ or Android Chrome)
    const checkARSupport = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      const isAndroid = /Android/.test(navigator.userAgent)
      const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)
      const isChrome = /Chrome/.test(navigator.userAgent)

      return (isIOS && isSafari) || (isAndroid && isChrome)
    }

    setIsARSupported(checkARSupport())
  }, [])

  // Generate simple box dimensions for AR visualization
  const getARDimensions = (obj: SizeObject) => {
    const height = obj.height || obj.length || 1
    const width = obj.width || height * 0.4
    const depth = obj.length || height * 0.4
    return { height, width, depth }
  }

  const obj1Dims = getARDimensions(object1)
  const obj2Dims = getARDimensions(object2)

  if (!isARSupported) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9 }}
          animate={{ scale: 1 }}
          className="glass rounded-2xl p-8 max-w-md w-full text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <Smartphone className="w-16 h-16 mx-auto mb-4 text-brand-500" />
          <h2 className="text-2xl font-bold mb-4">AR Not Available</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Augmented Reality requires:
          </p>
          <ul className="text-left space-y-2 mb-6">
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span>iOS 12+ with Safari, or</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-500" />
              <span>Android with Chrome browser</span>
            </li>
          </ul>
          <button
            onClick={onClose}
            className="w-full py-3 bg-brand-500 text-white rounded-xl font-semibold hover:bg-brand-600 transition-colors"
          >
            Got It
          </button>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-black z-50"
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-white" />
            <span className="text-white font-semibold">AR Mode</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      {/* Instructions */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute bottom-20 left-4 right-4 z-10"
          >
            <div className="glass rounded-2xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <Info className="w-6 h-6 text-brand-500 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-lg mb-2">How to Use AR</h3>
                  <ol className="space-y-2 text-sm">
                    <li className="flex gap-2">
                      <span className="font-bold text-brand-500">1.</span>
                      <span>Tap the AR button below</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-brand-500">2.</span>
                      <span>Point your camera at a flat surface</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-brand-500">3.</span>
                      <span>Move your phone to place the objects</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-bold text-brand-500">4.</span>
                      <span>Walk around to see them from all angles!</span>
                    </li>
                  </ol>
                </div>
              </div>
              <button
                onClick={() => setShowInstructions(false)}
                className="w-full py-2 bg-brand-500 text-white rounded-lg font-semibold hover:bg-brand-600 transition-colors"
              >
                Got It!
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AR Viewer Container */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-white p-8">
          <Camera className="w-20 h-20 mx-auto mb-4 animate-pulse" />
          <h2 className="text-2xl font-bold mb-2">AR Experience Ready</h2>
          <p className="text-gray-300 mb-6">
            Comparing: {object1.name} vs {object2.name}
          </p>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass rounded-xl p-4 text-left">
              <div className="text-sm text-gray-400 mb-1">Object 1</div>
              <div className="font-bold text-brand-500">{object1.name}</div>
              <div className="text-xs text-gray-400 mt-2">
                {obj1Dims.height.toFixed(1)}m tall
              </div>
            </div>
            <div className="glass rounded-xl p-4 text-left">
              <div className="text-sm text-gray-400 mb-1">Object 2</div>
              <div className="font-bold text-purple-500">{object2.name}</div>
              <div className="text-xs text-gray-400 mt-2">
                {obj2Dims.height.toFixed(1)}m tall
              </div>
            </div>
          </div>

          {/* AR Launch Button */}
          <button
            onClick={() => {
              // In production, this would trigger the actual AR view
              alert('AR Mode Coming Soon!\n\nThis feature will allow you to:\n• View objects in your real environment\n• Walk around them in 3D space\n• Take photos and videos\n• Share AR experiences\n\nRequires HTTPS deployment to work.')
            }}
            className="px-8 py-4 bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-full font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all flex items-center gap-2 mx-auto"
          >
            <Camera className="w-6 h-6" />
            Launch AR View
          </button>

          <p className="text-xs text-gray-400 mt-4">
            Note: AR requires camera permissions
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="text-center text-sm text-gray-400">
          <p>Powered by WebXR • sizeeasy.com</p>
        </div>
      </div>
    </motion.div>
  )
}
