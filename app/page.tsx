'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import HeroNew from '@/components/HeroNew'
import DynamicComparison from '@/components/DynamicComparison'
import Navigation from '@/components/Navigation'
import AdPlacement from '@/components/AdPlacement'

export default function Home() {
  const [comparisonObjects, setComparisonObjects] = useState<{
    object1: string
    object2: string
  } | null>(null)

  const handleCompare = (object1: string, object2: string) => {
    setComparisonObjects({ object1, object2 })
  }

  const handleBack = () => {
    setComparisonObjects(null)
  }

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
        {!comparisonObjects ? (
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <HeroNew onCompare={handleCompare} />

            {/* Ad Placement - Hero Banner */}
            <div className="flex justify-center py-8 px-4">
              <AdPlacement slot="hero" />
            </div>

            {/* Ad Placement - Footer */}
            <div className="flex justify-center py-12 px-4">
              <AdPlacement slot="footer" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <DynamicComparison
              object1Name={comparisonObjects.object1}
              object2Name={comparisonObjects.object2}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}
