'use client'

import { useState } from 'react'
import { Twitter, Facebook, Linkedin, Share2, Check } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

interface ShareButtonsProps {
  comparisonId?: string
  object1Name: string
  object2Name: string
  onCreditsEarned?: (credits: number) => void
}

export default function ShareButtons({
  comparisonId,
  object1Name,
  object2Name,
  onCreditsEarned,
}: ShareButtonsProps) {
  const [shared, setShared] = useState(false)
  const [loading, setLoading] = useState(false)

  const supabase = getSupabaseBrowserClient()

  const shareUrl = typeof window !== 'undefined' ? window.location.href : ''
  const shareText = `Check out this size comparison: ${object1Name} vs ${object2Name} on SizeEasy!`

  const handleShare = async (platform: 'twitter' | 'facebook' | 'linkedin' | 'other') => {
    setLoading(true)

    try {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        alert('Please sign in to earn credits for sharing!')
        setLoading(false)
        return
      }

      // Open share window
      let shareWindowUrl = ''

      switch (platform) {
        case 'twitter':
          shareWindowUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
            shareText
          )}&url=${encodeURIComponent(shareUrl)}`
          break
        case 'facebook':
          shareWindowUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
            shareUrl
          )}`
          break
        case 'linkedin':
          shareWindowUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
            shareUrl
          )}`
          break
        case 'other':
          // Use Web Share API if available
          if (navigator.share) {
            await navigator.share({
              title: 'SizeEasy Comparison',
              text: shareText,
              url: shareUrl,
            })
          } else {
            // Fallback: copy to clipboard
            await navigator.clipboard.writeText(shareUrl)
            alert('Link copied to clipboard!')
          }
          break
      }

      if (shareWindowUrl) {
        window.open(shareWindowUrl, '_blank', 'width=600,height=400')
      }

      // Award credits
      const response = await fetch('/api/credits/share-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          comparisonId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setShared(true)
        onCreditsEarned?.(result.creditsAwarded)
        setTimeout(() => setShared(false), 3000)
      }
    } catch (error) {
      console.error('Error sharing:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-gray-700">
        Share to earn +2 credits! ✨
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => handleShare('twitter')}
          disabled={loading || shared}
          className="flex items-center gap-2 rounded-lg bg-[#1DA1F2] px-4 py-2 text-sm font-medium text-white hover:bg-[#1a8cd8] disabled:opacity-50 transition-colors"
        >
          {shared ? <Check className="h-4 w-4" /> : <Twitter className="h-4 w-4" />}
          Twitter
        </button>

        <button
          onClick={() => handleShare('facebook')}
          disabled={loading || shared}
          className="flex items-center gap-2 rounded-lg bg-[#4267B2] px-4 py-2 text-sm font-medium text-white hover:bg-[#365899] disabled:opacity-50 transition-colors"
        >
          {shared ? <Check className="h-4 w-4" /> : <Facebook className="h-4 w-4" />}
          Facebook
        </button>

        <button
          onClick={() => handleShare('linkedin')}
          disabled={loading || shared}
          className="flex items-center gap-2 rounded-lg bg-[#0077B5] px-4 py-2 text-sm font-medium text-white hover:bg-[#006396] disabled:opacity-50 transition-colors"
        >
          {shared ? <Check className="h-4 w-4" /> : <Linkedin className="h-4 w-4" />}
          LinkedIn
        </button>

        <button
          onClick={() => handleShare('other')}
          disabled={loading || shared}
          className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {shared ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          More
        </button>
      </div>

      {shared && (
        <p className="text-sm font-medium text-green-600">
          +2 credits earned! Thanks for sharing 🎉
        </p>
      )}
    </div>
  )
}
