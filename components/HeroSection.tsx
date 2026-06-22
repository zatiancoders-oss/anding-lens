import Link from 'next/link'
import styles from './HeroSection.module.css'

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      {/* Background orbs */}
      <div className={styles.orb1} aria-hidden="true" />
      <div className={styles.orb2} aria-hidden="true" />
      <div className={styles.orb3} aria-hidden="true" />

      <div className="container">
        <div className={styles.content}>
          {/* Badge */}
          <div className={`badge badge-primary animate-fade-in-up ${styles.badge}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <path d="M6 0L7.5 4.5H12L8.25 7.5L9.75 12L6 9L2.25 12L3.75 7.5L0 4.5H4.5L6 0Z"/>
            </svg>
            AI-Powered Conversion Optimization
          </div>

          {/* Headline */}
          <h1 className={`${styles.headline} animate-fade-in-up delay-100`}>
            Turn Visitors Into{' '}
            <span className="gradient-text">Customers</span>{' '}
            With AI Audits
          </h1>

          {/* Sub-headline */}
          <p className={`${styles.subheadline} animate-fade-in-up delay-200`}>
            Paste any landing page URL and get an instant AI-powered audit.
            Discover exactly what's hurting your conversions and how to fix it —
            in under 30 seconds.
          </p>

          {/* CTA Buttons */}
          <div className={`${styles.ctas} animate-fade-in-up delay-300`}>
            <Link href="/auth/signup" className="btn btn-primary btn-lg" id="hero-signup-btn">
              Audit My Landing Page Free
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a href="#features" className="btn btn-secondary btn-lg" id="hero-features-btn">
              See how it works
            </a>
          </div>

          {/* Social Proof */}
          <div className={`${styles.socialProof} animate-fade-in-up delay-400`}>
            <div className={styles.avatars}>
              {['#7C58F6', '#22C55E', '#F59E0B', '#EF4444', '#3B82F6'].map((color, i) => (
                <div key={i} className={styles.avatar} style={{ background: color, marginLeft: i > 0 ? '-10px' : 0 }} />
              ))}
            </div>
            <p className={styles.socialText}>
              <strong>500+</strong> landing pages audited · Free plan included
            </p>
          </div>

          {/* Demo Card */}
          <div className={`${styles.demoCard} card card-glass animate-fade-in-up delay-500`}>
            <div className={styles.demoHeader}>
              <div className={styles.demoDots}>
                <span style={{ background: '#EF4444' }} />
                <span style={{ background: '#F59E0B' }} />
                <span style={{ background: '#22C55E' }} />
              </div>
              <span className={styles.demoUrl}>stripe.com</span>
            </div>
            <div className={styles.demoContent}>
              <div className={styles.demoScore}>
                <div className={styles.demoScoreCircle}>
                  <svg viewBox="0 0 100 100" className={styles.demoRing}>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--bg-tertiary)" strokeWidth="8"/>
                    <circle
                      cx="50" cy="50" r="40" fill="none"
                      stroke="url(#scoreGrad)" strokeWidth="8"
                      strokeDasharray="251.2" strokeDashoffset="50"
                      strokeLinecap="round"
                      style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                    />
                    <defs>
                      <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#7C58F6"/>
                        <stop offset="100%" stopColor="#22C55E"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className={styles.demoScoreNum}>82</span>
                </div>
                <div>
                  <p className={styles.demoScoreLabel}>Conversion Score</p>
                  <p className={styles.demoScoreSub}>Great foundation</p>
                </div>
              </div>
              <div className={styles.demoItems}>
                <div className={styles.demoItem}>
                  <span className="badge badge-success">✓</span>
                  <span>Strong headline clarity</span>
                </div>
                <div className={styles.demoItem}>
                  <span className="badge badge-warning">!</span>
                  <span>CTA could be more specific</span>
                </div>
                <div className={styles.demoItem}>
                  <span className="badge badge-danger">✗</span>
                  <span>Missing social proof above fold</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
