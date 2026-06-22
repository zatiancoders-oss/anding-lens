'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient, BYPASS_AUTH } from '@/lib/supabase/client'
import styles from '../auth.module.css'

export default function SignupPage() {
  const router = useRouter()

  useEffect(() => {
    if (BYPASS_AUTH) {
      router.replace('/dashboard')
    }
  }, [router])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Try to auto-login (works when email confirm is disabled in Supabase)
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (!loginError) {
        router.push('/dashboard')
      } else {
        setSuccess(true)
        setLoading(false)
      }
    }
  }

  if (success) {
    return (
      <div className={styles.page}>
        <div className={styles.orb1} aria-hidden="true" />
        <div className={styles.orb2} aria-hidden="true" />
        <div className={`card ${styles.card}`}>
          <div className={styles.successIcon}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--brand-accent)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className={styles.title}>Check your email</h1>
          <p className={styles.subtitle}>
            We sent a confirmation link to <strong>{email}</strong>.
            Click it to activate your account, then log in.
          </p>
          <Link href="/auth/login" className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: '24px' }}>
            Go to Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />

      <div className={`card ${styles.card}`}>
        <Link href="/" className={styles.logo}>
          <svg width="32" height="32" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#signupLogoGrad)" />
            <path d="M7 14L12 9L17 14L22 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 19L12 14L17 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            <defs>
              <linearGradient id="signupLogoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C58F6"/>
                <stop offset="1" stopColor="#4F46E5"/>
              </linearGradient>
            </defs>
          </svg>
          <span className={styles.logoText}>LandingLens</span>
        </Link>

        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start with 3 free audits per month</p>

        {error && (
          <div className={styles.error} role="alert">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="signup-email" className="label">Email address</label>
            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input input-lg"
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="signup-password" className="label">Password</label>
            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input input-lg"
              placeholder="Min. 8 characters"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            style={{ width: '100%' }}
            disabled={loading}
            id="signup-submit-btn"
          >
            {loading ? (
              <>
                <span className={styles.spinner} />
                Creating account...
              </>
            ) : (
              'Create free account'
            )}
          </button>
        </form>

        <p className={styles.terms}>
          By signing up, you agree to our Terms of Service.
        </p>

        <p className={styles.switchText}>
          Already have an account?{' '}
          <Link href="/auth/login" className={styles.switchLink}>
            Log in
          </Link>
        </p>
      </div>
    </div>
  )
}
