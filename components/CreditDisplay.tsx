'use client'

import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types/database'
import { Sparkles, Infinity } from 'lucide-react'

interface CreditDisplayProps {
  onUpgradeClick?: () => void
}

export default function CreditDisplay({ onUpgradeClick }: CreditDisplayProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [timeUntilReset, setTimeUntilReset] = useState('')
  const [loading, setLoading] = useState(true)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadProfile()

    // Subscribe to profile changes
    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
        },
        () => {
          loadProfile()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!profile || profile.is_premium) return

    // Update time until reset every minute
    const interval = setInterval(() => {
      updateTimeUntilReset()
    }, 60000)

    updateTimeUntilReset()

    return () => clearInterval(interval)
  }, [profile])

  const loadProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        console.error('Error loading profile:', error)
        setLoading(false)
        return
      }

      setProfile(data)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const updateTimeUntilReset = () => {
    if (!profile || profile.is_premium) return

    const reset = new Date(profile.credits_reset_time)
    const now = new Date()
    const diff = reset.getTime() - now.getTime()

    if (diff <= 0) {
      setTimeUntilReset('Ready to reset')
      loadProfile() // Reload to trigger reset
      return
    }

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    setTimeUntilReset(`${hours}h ${minutes}m`)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
      </div>
    )
  }

  if (!profile) {
    return null
  }

  if (profile.is_premium) {
    // Check if premium hasn't expired
    if (!profile.premium_expires || new Date(profile.premium_expires) > new Date()) {
      return (
        <div className="flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-white shadow-lg">
          <Infinity className="h-5 w-5" />
          <span className="font-semibold">UNLIMITED</span>
        </div>
      )
    }
  }

  // Free tier display
  const creditsRemaining = profile.credits_remaining
  const isLow = creditsRemaining <= 1
  const isEmpty = creditsRemaining === 0

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={isEmpty ? onUpgradeClick : undefined}
        className={`flex items-center gap-2 rounded-full px-4 py-2 shadow-md transition-all ${
          isEmpty
            ? 'bg-red-500 text-white hover:bg-red-600 cursor-pointer'
            : isLow
            ? 'bg-orange-100 text-orange-900'
            : 'bg-blue-100 text-blue-900'
        }`}
      >
        <Sparkles className="h-4 w-4" />
        <span className="font-semibold">
          {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} left
        </span>
      </button>

      {!isEmpty && (
        <span className="text-xs text-gray-600">Resets in {timeUntilReset}</span>
      )}

      {isEmpty && (
        <button
          onClick={onUpgradeClick}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Get more credits →
        </button>
      )}
    </div>
  )
}
