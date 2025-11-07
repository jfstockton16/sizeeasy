'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DynamicComparison from '@/components/DynamicComparison'
import Navigation from '@/components/Navigation'
import { motion } from 'framer-motion'

interface Props {
  params: {
    slug: string
  }
}

export default function ComparisonPage({ params }: Props) {
  const router = useRouter()

  // Parse slug like "elephant-vs-bus" or any dynamic comparison
  const parts = params.slug.split('-vs-')

  if (parts.length !== 2) {
    // Invalid format, redirect to home
    useEffect(() => {
      router.push('/')
    }, [router])

    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">Invalid Comparison</h1>
          <p className="text-gray-600">Redirecting you back...</p>
        </div>
      </div>
    )
  }

  const object1Name = parts[0].split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

  const object2Name = parts[1].split('-').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')

  const handleBack = () => {
    router.push('/')
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

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5 }}
      >
        <DynamicComparison
          object1Name={object1Name}
          object2Name={object2Name}
          onBack={handleBack}
        />
      </motion.div>
    </main>
  )
}
