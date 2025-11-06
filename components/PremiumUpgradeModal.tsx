'use client'

import { useState } from 'react'
import { X, Check, Sparkles, Infinity, Zap, Download, Star } from 'lucide-react'

interface PremiumUpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  triggerPoint?: string
  userComparisons?: number
}

export default function PremiumUpgradeModal({
  isOpen,
  onClose,
  triggerPoint,
  userComparisons = 0,
}: PremiumUpgradeModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleUpgrade = async () => {
    setLoading(true)

    try {
      // Call Stripe checkout API
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planType: selectedPlan,
          triggerPoint,
        }),
      })

      const { url, error } = await response.json()

      if (error) {
        alert('Failed to create checkout session. Please try again.')
        return
      }

      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout:', error)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl rounded-2xl bg-gradient-to-br from-purple-50 to-blue-50 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white p-2 text-gray-400 hover:text-gray-600 shadow-md"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-8 md:p-12">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 mb-4">
              <Sparkles className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">Upgrade to Premium</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              Go Unlimited with SizeEasy
            </h2>
            <p className="text-lg text-gray-600">
              {userComparisons > 0
                ? `You've made ${userComparisons} comparisons! Time to go unlimited 🚀`
                : 'Unlock unlimited comparisons and premium features'}
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Monthly Plan */}
            <button
              onClick={() => setSelectedPlan('monthly')}
              className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                selectedPlan === 'monthly'
                  ? 'border-blue-600 bg-white shadow-xl scale-105'
                  : 'border-gray-200 bg-white/50 hover:border-blue-300'
              }`}
            >
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Monthly</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-blue-600">$3.99</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              {selectedPlan === 'monthly' && (
                <div className="absolute right-4 top-4 rounded-full bg-blue-600 p-1">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </button>

            {/* Yearly Plan */}
            <button
              onClick={() => setSelectedPlan('yearly')}
              className={`relative rounded-2xl border-2 p-6 text-left transition-all ${
                selectedPlan === 'yearly'
                  ? 'border-purple-600 bg-white shadow-xl scale-105'
                  : 'border-gray-200 bg-white/50 hover:border-purple-300'
              }`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 px-3 py-1">
                <span className="text-xs font-bold text-white">SAVE 25%</span>
              </div>
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-gray-900">Yearly</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-purple-600">$29.99</span>
                  <span className="text-gray-600">/year</span>
                </div>
                <p className="mt-1 text-sm text-gray-600">Just $2.50/month</p>
              </div>
              {selectedPlan === 'yearly' && (
                <div className="absolute right-4 top-4 rounded-full bg-purple-600 p-1">
                  <Check className="h-5 w-5 text-white" />
                </div>
              )}
            </button>
          </div>

          {/* Features */}
          <div className="rounded-2xl bg-white p-6 mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Premium Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Infinity className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Unlimited Comparisons</p>
                  <p className="text-sm text-gray-600">No more credit limits</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <Star className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">No Watermarks</p>
                  <p className="text-sm text-gray-600">Clean, professional images</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Zap className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">HD Quality Exports</p>
                  <p className="text-sm text-gray-600">1024px vs 512px resolution</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <Download className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Multiple Formats</p>
                  <p className="text-sm text-gray-600">Download as GIF, Video, PNG</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-pink-100 p-2">
                  <Zap className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Priority Generation</p>
                  <p className="text-sm text-gray-600">Skip the queue</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-full bg-indigo-100 p-2">
                  <Star className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Unlimited History</p>
                  <p className="text-sm text-gray-600">Access all past comparisons</p>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 text-lg font-bold text-white shadow-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Processing...
              </span>
            ) : (
              <>Upgrade to Premium - ${selectedPlan === 'monthly' ? '3.99/mo' : '29.99/yr'}</>
            )}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
            Cancel anytime. No questions asked.
          </p>

          {/* Social Proof */}
          <div className="mt-6 rounded-xl bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-900">
              🔥 37% of SizeEasy users went Premium this week
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
