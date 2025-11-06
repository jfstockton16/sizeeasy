'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Layers, Scan, Lightbulb } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeroNewProps {
  onCompare: (object1: string, object2: string) => void
}

const CURIOSITY_EXAMPLES = [
  { obj1: 'BMW X4', obj2: 'Boeing 757', hint: 'Vehicle showdown' },
  { obj1: 'Eiffel Tower', obj2: 'T-Rex', hint: 'Height battle' },
  { obj1: 'Blue Whale', obj2: 'School Bus', hint: 'Ocean vs road' },
  { obj1: 'Empire State Building', obj2: 'Great Pyramid', hint: 'Ancient vs modern' },
  { obj1: 'African Elephant', obj2: 'Toyota Camry', hint: 'Nature vs machine' },
  { obj1: 'Basketball Court', obj2: 'Tennis Court', hint: 'Sports arena' },
  { obj1: 'iPhone 15', obj2: 'Credit Card', hint: 'Everyday items' },
  { obj1: 'Statue of Liberty', obj2: 'Giraffe', hint: 'Tall icons' },
]

export default function HeroNew({ onCompare }: HeroNewProps) {
  const [object1, setObject1] = useState('')
  const [object2, setObject2] = useState('')
  const [currentExample, setCurrentExample] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (!isTyping) {
      const interval = setInterval(() => {
        setCurrentExample((prev) => (prev + 1) % CURIOSITY_EXAMPLES.length)
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [isTyping])

  const handleCompare = () => {
    if (object1.trim() && object2.trim()) {
      onCompare(object1.trim(), object2.trim())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && object1.trim() && object2.trim()) {
      handleCompare()
    }
  }

  const loadExample = (example: typeof CURIOSITY_EXAMPLES[0]) => {
    setObject1(example.obj1)
    setObject2(example.obj2)
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-16 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 w-full">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Sparkles className="w-4 h-4 text-yellow-500 animate-pulse" />
            <span className="text-sm font-medium">
              AI-Powered • 3D Models • AR Exploration
            </span>
          </motion.div>

          {/* Main Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6 leading-tight"
          >
            Compare{' '}
            <span className="bg-gradient-to-r from-brand-500 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Anything
            </span>
            <br />
            in the{' '}
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-brand-500 bg-clip-text text-transparent">
              Universe
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto"
          >
            Type any two objects and explore their size difference in stunning 3D and AR
          </motion.p>

          {/* Main Comparison Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="max-w-4xl mx-auto mb-12"
          >
            <div className="glass rounded-3xl p-8 shadow-2xl">
              <div className="flex flex-col lg:flex-row gap-4 items-center">
                {/* Object 1 Input */}
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={object1}
                    onChange={(e) => {
                      setObject1(e.target.value)
                      setIsTyping(true)
                    }}
                    onBlur={() => setTimeout(() => setIsTyping(false), 1000)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type anything... (e.g., BMW X4)"
                    className="w-full px-6 py-4 text-lg rounded-2xl bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/20 outline-none transition-all"
                  />
                </div>

                {/* VS Badge */}
                <div className="flex-shrink-0">
                  <div className="px-6 py-3 rounded-full bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-xl shadow-lg">
                    VS
                  </div>
                </div>

                {/* Object 2 Input */}
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={object2}
                    onChange={(e) => {
                      setObject2(e.target.value)
                      setIsTyping(true)
                    }}
                    onBlur={() => setTimeout(() => setIsTyping(false), 1000)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type anything... (e.g., Boeing 757)"
                    className="w-full px-6 py-4 text-lg rounded-2xl bg-white/50 dark:bg-gray-800/50 border-2 border-gray-200 dark:border-gray-700 focus:border-purple-600 focus:ring-4 focus:ring-purple-600/20 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Compare Button */}
              <motion.button
                onClick={handleCompare}
                disabled={!object1.trim() || !object2.trim()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full mt-6 px-8 py-4 bg-gradient-to-r from-brand-500 via-purple-600 to-pink-600 text-white rounded-2xl font-semibold text-lg hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                <Layers className="w-5 h-5" />
                Generate 3D Comparison
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              {/* Features */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Sparkles className="w-4 h-4 text-brand-500" />
                  AI-Generated Dimensions
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Interactive 3D Models
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Scan className="w-4 h-4 text-pink-500" />
                  AR Exploration
                </div>
              </div>
            </div>
          </motion.div>

          {/* Curiosity Sparking Examples */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex items-center justify-center gap-2 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                Need inspiration? Try these:
              </h3>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CURIOSITY_EXAMPLES.map((example, index) => (
                <motion.button
                  key={index}
                  onClick={() => loadExample(example)}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className={`glass rounded-xl p-4 hover:shadow-lg transition-all duration-300 ${
                    index === currentExample
                      ? 'ring-2 ring-brand-500 shadow-brand-500/20'
                      : ''
                  }`}
                >
                  <div className="text-sm font-semibold mb-1 line-clamp-1">
                    {example.obj1}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">vs</div>
                  <div className="text-sm font-semibold mb-2 line-clamp-1">
                    {example.obj2}
                  </div>
                  <div className="text-xs text-brand-500 font-medium">
                    {example.hint}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* How it works */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="mt-20 max-w-4xl mx-auto"
          >
            <h3 className="text-2xl font-bold mb-8">How it works</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="glass rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h4 className="font-semibold text-lg mb-2">Type Anything</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Enter any two objects - from tiny atoms to massive galaxies. Our AI knows them all.
                </p>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h4 className="font-semibold text-lg mb-2">AI Generates</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  We fetch accurate dimensions and create photorealistic 3D models using cutting-edge AI.
                </p>
              </div>

              <div className="glass rounded-2xl p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-600 to-brand-500 flex items-center justify-center mb-4 mx-auto">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h4 className="font-semibold text-lg mb-2">Explore in AR</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  View your comparison in stunning 3D or place it in your room with AR technology.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
