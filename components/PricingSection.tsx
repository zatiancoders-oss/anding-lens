import Link from 'next/link'
import styles from './PricingSection.module.css'

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for getting started and trying out LandingLens.',
    features: [
      '3 audits per month',
      'Full AI analysis report',
      'Score breakdown (6 factors)',
      'Suggested headline + CTA',
      'Audit history',
    ],
    limitations: [
      'No priority processing',
    ],
    cta: 'Get Started Free',
    href: '/auth/signup',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$5',
    period: 'per month',
    description: 'For marketers and founders who optimize continuously.',
    badge: 'Most Popular',
    features: [
      'Unlimited audits',
      'Full AI analysis report',
      'Score breakdown (6 factors)',
      'Suggested headline + CTA',
      'Audit history',
      'Priority AI processing',
      'Export reports as PDF',
    ],
    limitations: [],
    cta: 'Upgrade to Pro',
    href: '/auth/signup?plan=pro',
    highlighted: true,
  },
]

export default function PricingSection() {
  return (
    <section className="section" id="pricing">
      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className="badge badge-primary" style={{ marginBottom: '16px' }}>
            Simple Pricing
          </div>
          <h2 className={styles.title}>
            Start Free, Upgrade When{' '}
            <span className="gradient-text">Ready</span>
          </h2>
          <p className={styles.subtitle}>
            No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className={styles.grid}>
          {plans.map((plan, i) => (
            <div
              key={i}
              className={`${styles.card} ${plan.highlighted ? styles.highlighted : ''}`}
            >
              {plan.badge && (
                <div className={styles.badge}>{plan.badge}</div>
              )}

              <div className={styles.planHeader}>
                <h3 className={styles.planName}>{plan.name}</h3>
                <div className={styles.priceRow}>
                  <span className={styles.price}>{plan.price}</span>
                  <span className={styles.period}>/{plan.period}</span>
                </div>
                <p className={styles.description}>{plan.description}</p>
              </div>

              <hr className="divider" />

              <ul className={styles.features}>
                {plan.features.map((f, j) => (
                  <li key={j} className={styles.featureItem}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="8" fill={plan.highlighted ? 'rgba(124,88,246,0.15)' : 'rgba(34,197,94,0.12)'}/>
                      <path d="M5 8l2 2 4-4" stroke={plan.highlighted ? '#7C58F6' : '#22C55E'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={`btn btn-lg ${plan.highlighted ? 'btn-primary' : 'btn-outline'} ${styles.cta}`}
                id={`pricing-${plan.name.toLowerCase()}-btn`}
              >
                {plan.cta}
                {plan.highlighted && (
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ / Note */}
        <p className={styles.note}>
          Pro upgrade is currently manual — contact us after signup.
          {' '}Questions? Email{' '}
          <a href="mailto:hello@landinglens.app" style={{ color: 'var(--brand-primary)' }}>
            hello@landinglens.app
          </a>
        </p>
      </div>
    </section>
  )
}
