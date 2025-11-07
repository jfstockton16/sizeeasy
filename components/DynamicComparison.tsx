'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Loader2, Sparkles, Layers, Download, Share2 } from 'lucide-react'
import dynamic from 'next/dynamic'

// Dynamic imports to avoid SSR issues
const Comparison3DViewer = dynamic(() => import('./Comparison3DViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[600px] glass rounded-2xl">
      <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
    </div>
  ),
})

const ComparisonARViewer = dynamic(() => import('./ComparisonARViewer'), {
  ssr: false,
})

interface DynamicComparisonProps {
  object1Name: string
  object2Name: string
  onBack: () => void
}

interface ObjectData {
  name: string
  category: string
  height?: number
  width?: number
  length?: number
  weight?: number
  volume?: number
  description: string
  funFacts: string[]
  confidence: number
  modelUrl?: string
  thumbnailUrl?: string
  taskId?: string
  modelStatus?: 'pending' | 'generating' | 'ready' | 'error'
}

type ViewMode = 'side-by-side' | '3d' | 'ar'

export default function DynamicComparison({
  object1Name,
  object2Name,
  onBack,
}: DynamicComparisonProps) {
  const [object1, setObject1] = useState<ObjectData | null>(null)
  const [object2, setObject2] = useState<ObjectData | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('side-by-side')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generatingModels, setGeneratingModels] = useState(false)

  // Fetch dimensions on mount
  useEffect(() => {
    fetchDimensions()
  }, [object1Name, object2Name])

  // Start 3D model generation after dimensions are fetched
  useEffect(() => {
    if (object1 && object2 && !generatingModels && viewMode === '3d') {
      generate3DModels()
    }
  }, [object1, object2, viewMode])

  async function fetchDimensions() {
    setLoading(true)
    setError(null)

    try {
      // Use the proper comparison API endpoint with caching and auth
      const res = await fetch('/api/comparison/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          object1Name: object1Name,
          object2Name: object2Name,
        }),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Failed to fetch object dimensions')
      }

      const result = await res.json()

      if (!result.success || !result.data) {
        throw new Error('Invalid response from server')
      }

      // Extract the dimension data from the response
      setObject1({ ...result.data.object1, modelStatus: 'pending' })
      setObject2({ ...result.data.object2, modelStatus: 'pending' })
    } catch (err: any) {
      setError(err.message || 'Failed to load comparison. Please try again.')
      console.error('Fetch dimensions error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function generate3DModels() {
    if (!object1 || !object2) return

    setGeneratingModels(true)

    try {
      // Start generation for both objects
      const [res1, res2] = await Promise.all([
        fetch('/api/generate-3d-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectName: object1.name,
            category: object1.category,
            dimensions: {
              height: object1.height,
              width: object1.width,
              length: object1.length,
            },
          }),
        }),
        fetch('/api/generate-3d-model', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            objectName: object2.name,
            category: object2.category,
            dimensions: {
              height: object2.height,
              width: object2.width,
              length: object2.length,
            },
          }),
        }),
      ])

      const data1 = await res1.json()
      const data2 = await res2.json()

      if (data1.success && data2.success) {
        setObject1((prev) => prev ? {
          ...prev,
          taskId: data1.data.taskId,
          modelStatus: 'generating',
        } : null)
        setObject2((prev) => prev ? {
          ...prev,
          taskId: data2.data.taskId,
          modelStatus: 'generating',
        } : null)

        // Poll for completion
        pollModelStatus(data1.data.taskId, setObject1)
        pollModelStatus(data2.data.taskId, setObject2)
      }
    } catch (err) {
      console.error('3D model generation error:', err)
    } finally {
      setGeneratingModels(false)
    }
  }

  async function pollModelStatus(
    taskId: string,
    setObject: React.Dispatch<React.SetStateAction<ObjectData | null>>
  ) {
    const maxAttempts = 60 // 3 minutes at 3s intervals
    let attempts = 0

    const poll = async () => {
      try {
        const res = await fetch(`/api/generate-3d-model?taskId=${taskId}`)
        const data = await res.json()

        if (data.success) {
          if (data.data.status === 'SUCCEEDED') {
            setObject((prev) => prev ? {
              ...prev,
              modelUrl: data.data.model_url,
              thumbnailUrl: data.data.thumbnail_url,
              modelStatus: 'ready',
            } : null)
            return
          } else if (data.data.status === 'FAILED') {
            setObject((prev) => prev ? { ...prev, modelStatus: 'error' } : null)
            return
          }
        }

        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000)
        } else {
          setObject((prev) => prev ? { ...prev, modelStatus: 'error' } : null)
        }
      } catch (err) {
        console.error('Polling error:', err)
        attempts++
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000)
        }
      }
    }

    poll()
  }

  function calculateSizeRatio() {
    if (!object1 || !object2) return '...'

    const vol1 = object1.volume || (object1.height || 1) * (object1.width || 1) * (object1.length || 1)
    const vol2 = object2.volume || (object2.height || 1) * (object2.width || 1) * (object2.length || 1)

    const ratio = vol1 / vol2
    if (ratio > 1) {
      return `${ratio.toFixed(1)}x larger`
    } else {
      return `${(1 / ratio).toFixed(1)}x smaller`
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-brand-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Fetching AI data...</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Getting accurate dimensions for {object1Name} and {object2Name}
          </p>
        </div>
      </div>
    )
  }

  if (error || !object1 || !object2) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={onBack}
            className="px-6 py-3 bg-brand-500 text-white rounded-full font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 glass rounded-full hover:shadow-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-2">
            <button className="p-3 glass rounded-full hover:shadow-lg transition-all">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-3 glass rounded-full hover:shadow-lg transition-all">
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Comparison Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="text-brand-500">{object1.name}</span>
            {' vs '}
            <span className="text-purple-600">{object2.name}</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            {object1.name} is {calculateSizeRatio()} than {object2.name}
          </p>
        </motion.div>

        {/* View Mode Selector */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg'
                : 'glass hover:shadow-lg'
            }`}
          >
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`px-6 py-3 rounded-full font-semibold transition-all flex items-center gap-2 ${
              viewMode === '3d'
                ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg'
                : 'glass hover:shadow-lg'
            }`}
          >
            <Layers className="w-4 h-4" />
            3D View
          </button>
          <button
            onClick={() => setViewMode('ar')}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              viewMode === 'ar'
                ? 'bg-gradient-to-r from-brand-500 to-purple-600 text-white shadow-lg'
                : 'glass hover:shadow-lg'
            }`}
          >
            AR Mode
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {viewMode === 'side-by-side' && (
            <motion.div
              key="side-by-side"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              {/* Object 1 Card */}
              <div className="glass rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-4 text-brand-500">{object1.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{object1.description}</p>

                <div className="space-y-3 mb-6">
                  {object1.height && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Height:</span>
                      <span className="font-semibold">{(object1.height * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object1.width && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Width:</span>
                      <span className="font-semibold">{(object1.width * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object1.length && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Length:</span>
                      <span className="font-semibold">{(object1.length * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object1.weight && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                      <span className="font-semibold">
                        {object1.weight * 2.20462 >= 2000
                          ? `${((object1.weight * 2.20462) / 2000).toFixed(1)} tons`
                          : `${Math.round(object1.weight * 2.20462).toLocaleString()} lbs`
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Fun Facts
                  </h4>
                  <ul className="space-y-2">
                    {object1.funFacts.map((fact, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                        <span className="text-brand-500">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Object 2 Card */}
              <div className="glass rounded-3xl p-8">
                <h3 className="text-2xl font-bold mb-4 text-purple-600">{object2.name}</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">{object2.description}</p>

                <div className="space-y-3 mb-6">
                  {object2.height && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Height:</span>
                      <span className="font-semibold">{(object2.height * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object2.width && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Width:</span>
                      <span className="font-semibold">{(object2.width * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object2.length && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Length:</span>
                      <span className="font-semibold">{(object2.length * 3.28084).toFixed(1)} ft</span>
                    </div>
                  )}
                  {object2.weight && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Weight:</span>
                      <span className="font-semibold">
                        {object2.weight * 2.20462 >= 2000
                          ? `${((object2.weight * 2.20462) / 2000).toFixed(1)} tons`
                          : `${Math.round(object2.weight * 2.20462).toLocaleString()} lbs`
                        }
                      </span>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    Fun Facts
                  </h4>
                  <ul className="space-y-2">
                    {object2.funFacts.map((fact, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                        <span className="text-purple-600">•</span>
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          )}

          {viewMode === '3d' && (
            <motion.div
              key="3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {generatingModels || object1.modelStatus === 'generating' || object2.modelStatus === 'generating' ? (
                <div className="glass rounded-3xl p-12 text-center">
                  <Loader2 className="w-16 h-16 animate-spin text-brand-500 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold mb-2">Generating 3D Models...</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Creating photorealistic 3D models using AI. This may take 1-2 minutes.
                  </p>
                </div>
              ) : (
                <Comparison3DViewer
                  object1={{
                    id: '1',
                    name: object1.name,
                    category: object1.category,
                    height: object1.height,
                    width: object1.width,
                    length: object1.length,
                    description: object1.description,
                    imagePrompt: '',
                  }}
                  object2={{
                    id: '2',
                    name: object2.name,
                    category: object2.category,
                    height: object2.height,
                    width: object2.width,
                    length: object2.length,
                    description: object2.description,
                    imagePrompt: '',
                  }}
                />
              )}
            </motion.div>
          )}

          {viewMode === 'ar' && (
            <motion.div
              key="ar"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ComparisonARViewer
                object1={{
                  id: '1',
                  name: object1.name,
                  category: object1.category,
                  height: object1.height,
                  width: object1.width,
                  length: object1.length,
                  description: object1.description,
                  imagePrompt: '',
                }}
                object2={{
                  id: '2',
                  name: object2.name,
                  category: object2.category,
                  height: object2.height,
                  width: object2.width,
                  length: object2.length,
                  description: object2.description,
                  imagePrompt: '',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
