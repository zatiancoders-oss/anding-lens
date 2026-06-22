import Link from 'next/link'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <div className={styles.brand}>
          <Link href="/" className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <rect width="28" height="28" rx="8" fill="url(#footerLogoGrad)" />
              <path d="M7 14L12 9L17 14L22 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 19L12 14L17 19" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
              <defs>
                <linearGradient id="footerLogoGrad" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C58F6"/>
                  <stop offset="1" stopColor="#4F46E5"/>
                </linearGradient>
              </defs>
            </svg>
            <span className={styles.logoText}>LandingLens</span>
          </Link>
          <p className={styles.tagline}>
            AI-powered landing page audits for better conversions.
          </p>
        </div>

        <div className={styles.links}>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>Product</h4>
            <a href="#features" className={styles.link}>Features</a>
            <a href="#pricing" className={styles.link}>Pricing</a>
            <Link href="/auth/signup" className={styles.link}>Sign up free</Link>
          </div>
          <div className={styles.linkGroup}>
            <h4 className={styles.linkGroupTitle}>Account</h4>
            <Link href="/auth/login" className={styles.link}>Log in</Link>
            <Link href="/dashboard" className={styles.link}>Dashboard</Link>
          </div>
        </div>
      </div>

      <div className={`container ${styles.bottom}`}>
        <p className={styles.copyright}>
          © {new Date().getFullYear()} LandingLens. Built for founders.
        </p>
      </div>
    </footer>
  )
}
