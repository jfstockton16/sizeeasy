'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Hero from '@/components/Hero'
import ComparisonCreator from '@/components/ComparisonCreator'
import TrendingComparisons from '@/components/TrendingComparisons'
import DailyChallengePreview from '@/components/DailyChallengePreview'
import StatsBar from '@/components/StatsBar'
import Navigation from '@/components/Navigation'

export default function Home() {
  const [showCreator, setShowCreator] = useState(false)

  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-purple-900/20" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse-glow" />
          <div className="absolute top-3/4 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse-glow animation-delay-2000" />
          <div className="absolute bottom-1/4 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl animate-pulse-glow animation-delay-4000" />
        </div>
      </div>

      <Navigation />

      <AnimatePresence mode="wait">
        {!showCreator ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Hero onStartComparison={() => setShowCreator(true)} />
            <StatsBar />
            <DailyChallengePreview />
            <TrendingComparisons onComparisonClick={() => setShowCreator(true)} />
          </motion.div>
        ) : (
          <motion.div
            key="creator"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <ComparisonCreator onBack={() => setShowCreator(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
