'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Zap, Users, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'

interface HeroProps {
  onStartComparison: () => void
}

const EXAMPLE_COMPARISONS = [
  { item1: 'Blue Whale', item2: 'School Bus', factor: '3x longer' },
  { item1: 'Eiffel Tower', item2: 'Statue of Liberty', factor: '2.9x taller' },
  { item1: 'Great Pyramid', item2: 'Football Field', factor: '481 feet tall' },
  { item1: 'T-Rex', item2: 'Giraffe', factor: '2x heavier' },
  { item1: 'Moon', item2: 'Earth', factor: '27% the size' },
]

export default function Hero({ onStartComparison }: HeroProps) {
  const [currentComparison, setCurrentComparison] = useState(0)
  const [activeUsers, setActiveUsers] = useState(8427)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentComparison((prev) => (prev + 1) % EXAMPLE_COMPARISONS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Simulate live user count
    const interval = setInterval(() => {
      setActiveUsers((prev) => prev + Math.floor(Math.random() * 5))
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="relative min-h-screen flex items-center justify-center pt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8"
          >
            <Zap className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium">
              <span className="text-brand-500 font-bold">{activeUsers.toLocaleString()}</span> people comparing right now
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
            Visualize{' '}
            <span className="bg-gradient-to-r from-pink-600 via-purple-600 to-brand-500 bg-clip-text text-transparent">
              Everything
            </span>
          </motion.h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl sm:text-2xl text-gray-600 dark:text-gray-400 mb-12 max-w-3xl mx-auto"
          >
            The internet's most addictive size comparison tool.
            <br />
            Powered by AI. Built for sharing.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <button
              onClick={onStartComparison}
              className="group px-8 py-4 bg-gradient-to-r from-brand-500 to-purple-600 text-white rounded-full font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
            >
              Start Comparing Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => {
                const trendingSection = document.getElementById('trending')
                trendingSection?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="px-8 py-4 glass rounded-full font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              See Examples
            </button>
          </motion.div>

          {/* Rotating Example */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="glass rounded-2xl p-8 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {EXAMPLE_COMPARISONS[currentComparison].item1}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">vs</div>
              </div>
              <div className="w-px h-16 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-700 to-transparent" />
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">
                  {EXAMPLE_COMPARISONS[currentComparison].item2}
                </div>
                <div className="text-sm text-brand-500 font-semibold">
                  {EXAMPLE_COMPARISONS[currentComparison].factor}
                </div>
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center gap-2 mt-6">
              {EXAMPLE_COMPARISONS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentComparison(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentComparison
                      ? 'bg-brand-500 w-8'
                      : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                  aria-label={`View comparison ${index + 1}`}
                />
              ))}
            </div>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap justify-center gap-8 mt-16 text-center"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-brand-500" />
              <div>
                <div className="font-bold text-2xl">150K+</div>
                <div className="text-sm text-gray-500">Comparisons Created</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-500" />
              <div>
                <div className="font-bold text-2xl">89%</div>
                <div className="text-sm text-gray-500">Share Rate</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-brand-500" />
              <div>
                <div className="font-bold text-2xl">&lt;2s</div>
                <div className="text-sm text-gray-500">Avg. Creation Time</div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
