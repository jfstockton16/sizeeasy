'use client'

import { useState } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'signin' | 'signup'
  referralCode?: string | null
}

export default function AuthModal({
  isOpen,
  onClose,
  mode = 'signin',
  referralCode = null,
}: AuthModalProps) {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(mode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = getSupabaseBrowserClient()

  if (!isOpen) return null

  const handleSignUp = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            referred_by_code: referralCode,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.user) {
        // Create user profile
        const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          email: data.user.email,
          display_name: displayName,
          // If referred, we'll handle the referral credits in a trigger or API
        })

        if (profileError) {
          console.error('Error creating profile:', profileError)
        }

        setMessage('Account created! Check your email to verify.')
        setTimeout(() => {
          onClose()
          window.location.reload()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up')
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      setMessage('Signed in successfully!')
      setTimeout(() => {
        onClose()
        window.location.reload()
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (authMode === 'signin') {
      handleSignIn()
    } else {
      handleSignUp()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-6 text-2xl font-bold text-gray-900">
          {authMode === 'signin' ? 'Welcome back' : 'Get started for free'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authMode === 'signup' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
                placeholder="Your name"
                required={authMode === 'signup'}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-600">{message}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : authMode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          {authMode === 'signin' ? (
            <>
              Don't have an account?{' '}
              <button
                onClick={() => setAuthMode('signup')}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setAuthMode('signin')}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        {authMode === 'signup' && (
          <div className="mt-4 rounded-lg bg-blue-50 p-4 text-center">
            <p className="text-sm font-medium text-blue-900">Get 10 free credits on signup! 🎉</p>
            {referralCode && (
              <p className="mt-1 text-xs text-blue-700">
                Referred by a friend? You'll both get bonus credits!
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
