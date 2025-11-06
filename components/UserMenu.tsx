'use client'

import { useState, useEffect } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { UserProfile } from '@/lib/types/database'
import { User as UserIcon, LogOut, Crown, History, Share2 } from 'lucide-react'

interface UserMenuProps {
  onAuthClick: () => void
  onUpgradeClick: () => void
}

export default function UserMenu({ onAuthClick, onUpgradeClick }: UserMenuProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    loadUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const loadUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)

    if (user) {
      loadProfile(user.id)
    }
  }

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (!error && data) {
      setProfile(data)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    setIsOpen(false)
    window.location.reload()
  }

  if (!user) {
    return (
      <button
        onClick={onAuthClick}
        className="rounded-full bg-blue-600 px-6 py-2 font-semibold text-white shadow-md hover:bg-blue-700 transition-colors"
      >
        Sign In
      </button>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 hover:bg-gray-200 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
          {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="font-medium text-gray-900">
          {profile?.display_name || user.email?.split('@')[0]}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-2 w-64 rounded-xl bg-white shadow-2xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <p className="font-semibold text-gray-900">{profile?.display_name || 'User'}</p>
              <p className="text-sm text-gray-600">{user.email}</p>
              {profile?.is_founder && (
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-900">
                  <Crown className="h-3 w-3" />
                  Founder
                </span>
              )}
            </div>

            <div className="p-2">
              {!profile?.is_premium && (
                <button
                  onClick={() => {
                    setIsOpen(false)
                    onUpgradeClick()
                  }}
                  className="flex w-full items-center gap-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-3 text-left text-white hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  <Crown className="h-5 w-5" />
                  <div>
                    <p className="font-semibold">Upgrade to Premium</p>
                    <p className="text-xs opacity-90">Unlimited comparisons</p>
                  </div>
                </button>
              )}

              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors mt-1">
                <History className="h-5 w-5" />
                <span>History</span>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                <Share2 className="h-5 w-5" />
                <div className="flex-1">
                  <span>Referrals</span>
                  {profile && profile.referral_credits_earned > 0 && (
                    <span className="ml-2 text-xs text-green-600">
                      +{profile.referral_credits_earned} credits
                    </span>
                  )}
                </div>
              </button>

              <button className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-gray-700 hover:bg-gray-100 transition-colors">
                <UserIcon className="h-5 w-5" />
                <span>Account Settings</span>
              </button>
            </div>

            <div className="border-t border-gray-200 p-2">
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-lg px-4 py-2 text-left text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            </div>

            {profile && (
              <div className="border-t border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                <p>
                  <span className="font-medium">{profile.total_comparisons}</span> total
                  comparisons
                </p>
                <p className="mt-1">
                  Referral code: <span className="font-mono font-medium">{profile.referral_code}</span>
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
