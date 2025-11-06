'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Search, Sparkles, ArrowLeftRight, Share2, Download } from 'lucide-react'
import { useComparisonStore } from '@/lib/store'
import ObjectSelector from './ObjectSelector'
import ComparisonViewer from './ComparisonViewer'

interface ComparisonCreatorProps {
  onBack: () => void
}

type Step = 'select-first' | 'select-second' | 'view'

export default function ComparisonCreator({ onBack }: ComparisonCreatorProps) {
  const [step, setStep] = useState<Step>('select-first')
  const {
    selectedObject1,
    selectedObject2,
    setObject1,
    setObject2,
    swapObjects,
    clearComparison,
  } = useComparisonStore()

  const handleObject1Select = (obj: any) => {
    setObject1(obj)
    setStep('select-second')
  }

  const handleObject2Select = (obj: any) => {
    setObject2(obj)
    setStep('view')
  }

  const handleReset = () => {
    clearComparison()
    setStep('select-first')
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {['select-first', 'select-second', 'view'].map((s, index) => (
        <div key={s} className="flex items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
              step === s
                ? 'bg-brand-500 text-white scale-110'
                : index < ['select-first', 'select-second', 'view'].indexOf(step)
                ? 'bg-green-500 text-white'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-600'
            }`}
          >
            {index + 1}
          </div>
          {index < 2 && (
            <div
              className={`w-12 h-0.5 mx-1 ${
                index < ['select-first', 'select-second', 'view'].indexOf(step)
                  ? 'bg-green-500'
                  : 'bg-gray-300 dark:bg-gray-700'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-brand-500 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Home
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Create Comparison</h1>
              <p className="text-gray-600 dark:text-gray-400">
                {step === 'select-first' && 'Select your first object'}
                {step === 'select-second' && 'Now select the second object to compare'}
                {step === 'view' && 'View and share your comparison'}
              </p>
            </div>

            {step === 'view' && (
              <button
                onClick={handleReset}
                className="px-4 py-2 glass rounded-lg hover:shadow-lg transition-all"
              >
                Start Over
              </button>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Current Selection Preview */}
        {(selectedObject1 || selectedObject2) && step !== 'view' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-xl p-4 mb-6"
          >
            <div className="flex items-center justify-center gap-8">
              {selectedObject1 && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-brand-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">First Object</div>
                    <div className="font-bold">{selectedObject1.name}</div>
                  </div>
                </div>
              )}

              {selectedObject1 && selectedObject2 && (
                <div className="text-gray-400">vs</div>
              )}

              {selectedObject2 && (
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Second Object</div>
                    <div className="font-bold">{selectedObject2.name}</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Main Content */}
        <AnimatePresence mode="wait">
          {step === 'select-first' && (
            <motion.div
              key="select-first"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ObjectSelector onSelect={handleObject1Select} />
            </motion.div>
          )}

          {step === 'select-second' && (
            <motion.div
              key="select-second"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <ObjectSelector onSelect={handleObject2Select} />
            </motion.div>
          )}

          {step === 'view' && selectedObject1 && selectedObject2 && (
            <motion.div
              key="view"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ComparisonViewer object1={selectedObject1} object2={selectedObject2} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
