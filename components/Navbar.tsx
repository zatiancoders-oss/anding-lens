'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useTheme } from './ThemeProvider'
import styles from './Navbar.module.css'

interface NavbarProps {
  variant?: 'landing' | 'dashboard'
  userEmail?: string | null
}

export default function Navbar({ variant = 'landing', userEmail }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className={styles.nav}>
      <div className={`container ${styles.inner}`}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="8" fill="url(#logoGrad)" />
            <path d="M7 14L12 9L17 14L22 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 19L12 14L17 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
            <defs>
              <linearGradient id="logoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#7C58F6"/>
                <stop offset="1" stopColor="#4F46E5"/>
              </linearGradient>
            </defs>
          </svg>
          <span className={styles.logoText}>LandingLens</span>
        </Link>

        {/* Desktop Nav Links */}
        {variant === 'landing' && (
          <div className={`${styles.links} hide-mobile`}>
            <a href="#features" className={styles.link}>Features</a>
            <a href="#pricing" className={styles.link}>Pricing</a>
          </div>
        )}

        {/* Actions */}
        <div className={styles.actions}>
          <button
            onClick={toggleTheme}
            className={`btn btn-ghost btn-sm ${styles.themeBtn}`}
            aria-label="Toggle theme"
            id="theme-toggle-btn"
          >
            {theme === 'dark' ? (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="5" strokeWidth="2"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {variant === 'landing' ? (
            <>
              <Link href="/auth/login" className="btn btn-ghost btn-sm hide-mobile" id="nav-login-btn">
                Log in
              </Link>
              <Link href="/auth/signup" className="btn btn-primary btn-sm" id="nav-signup-btn">
                Sign up free
              </Link>
            </>
          ) : (
            <>
              <span className={`${styles.userEmail} hide-mobile`}>{userEmail}</span>
              <Link href="/dashboard" className="btn btn-ghost btn-sm">Dashboard</Link>
              <Link href="/dashboard/history" className="btn btn-ghost btn-sm hide-mobile">History</Link>
              <form action="/api/auth/signout" method="POST" className="hide-mobile">
                <button type="submit" className="btn btn-ghost btn-sm" id="nav-signout-btn">Sign out</button>
              </form>
            </>
          )}

          {/* Mobile Menu Button */}
          <button
            className={`${styles.menuBtn} hide-desktop`}
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className={styles.mobileMenu}>
          {variant === 'landing' && (
            <>
              <a href="#features" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Features</a>
              <a href="#pricing" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Pricing</a>
              <Link href="/auth/login" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Log in</Link>
            </>
          )}
          {variant === 'dashboard' && (
            <>
              <Link href="/dashboard" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Dashboard</Link>
              <Link href="/dashboard/history" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>History</Link>
              <form action="/api/auth/signout" method="POST">
                <button type="submit" className={styles.mobileLink} style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--brand-danger)' }}>Sign out</button>
              </form>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
