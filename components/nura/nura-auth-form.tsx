'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Apple } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { NuraLogo } from './nura-logo'
import { cn } from '@/lib/utils'

interface NuraAuthFormProps {
  mode?: 'login' | 'signup'
  className?: string
}

export function NuraAuthForm({ mode = 'login', className }: NuraAuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [showEmailForm, setShowEmailForm] = useState(false)
  const router = useRouter()

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        if (password !== repeatPassword) {
          setError('Passwords do not match')
          setIsLoading(false)
          return
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/protected`,
          },
        })
        if (error) throw error
        router.push('/auth/sign-up-success')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push('/')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    const supabase = createClient()
    setIsGoogleLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Google')
      setIsGoogleLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    const supabase = createClient()
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to sign in with Apple')
    }
  }

  return (
    <div className={cn('min-h-screen flex flex-col', className)}>
      {/* Skip Button */}
      <div className="flex justify-end p-4 pt-6">
        <Link
          href="/"
          className="flex items-center gap-1 px-4 py-2 bg-card rounded-full text-sm font-medium text-foreground hover:opacity-80 transition-opacity"
        >
          Skip <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        {/* Logo */}
        <div className="mb-8">
          <NuraLogo size="lg" variant="full" />
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-semibold text-foreground text-center mb-2">
          Sign in or create an account
        </h1>
        <p className="text-muted-foreground text-center mb-8">
          Save and retrieve your research
        </p>

        {/* Auth Buttons */}
        <div className="w-full max-w-sm space-y-3">
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-3 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
          </button>

          {/* Apple Sign In */}
          <button
            onClick={handleAppleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-card text-foreground py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity"
          >
            <Apple className="h-5 w-5" />
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="py-2">
            <div className="border-t border-border" />
          </div>

          {/* Email Input / Form */}
          {!showEmailForm ? (
            <>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 rounded-full bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
              />
              <button
                onClick={() => {
                  if (email) setShowEmailForm(true)
                }}
                disabled={!email}
                className="w-full flex items-center justify-center gap-2 bg-card text-foreground py-4 rounded-full font-medium border border-border hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Continue with email
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-4 rounded-full bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
                required
              />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-4 rounded-full bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
                required
              />
              {mode === 'signup' && (
                <input
                  type="password"
                  placeholder="Repeat your password"
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="w-full px-4 py-4 rounded-full bg-muted text-foreground placeholder:text-muted-foreground border-0 focus:ring-2 focus:ring-ring outline-none"
                  required
                />
              )}
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 bg-nura-cream text-nura-forest py-4 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
              </button>
              {mode === 'login' && (
                <Link
                  href="/auth/forgot-password"
                  className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Forgot your password?
                </Link>
              )}
            </form>
          )}

          {error && !showEmailForm && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </div>
      </div>
    </div>
  )
}
