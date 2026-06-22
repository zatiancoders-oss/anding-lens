import styles from './FeaturesSection.module.css'

const features = [
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: '#7C58F6',
    title: 'Headline Clarity Analysis',
    description: 'AI scores how clearly your headline communicates your unique value proposition and what action visitors should take.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
      </svg>
    ),
    color: '#22C55E',
    title: 'CTA Effectiveness Score',
    description: 'Evaluate the strength, placement, and persuasiveness of your call-to-action buttons with actionable improvement tips.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    color: '#F59E0B',
    title: 'Trust Signal Detection',
    description: 'Identify missing testimonials, security badges, guarantees, and social proof elements that boost visitor confidence.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    color: '#3B82F6',
    title: 'Readability Check',
    description: 'Measure reading level, sentence complexity, and content scannability to ensure your message resonates with your audience.',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    color: '#EC4899',
    title: 'Value Proposition Audit',
    description: "Assess how clearly your page communicates what makes you different and why visitors should choose you over competitors.",
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    color: '#14B8A6',
    title: 'Basic SEO Analysis',
    description: 'Check title tags, meta descriptions, heading structure, and keyword usage to improve organic discoverability.',
  },
]

export default function FeaturesSection() {
  return (
    <section className={`section ${styles.features}`} id="features">
      {/* Background */}
      <div className={styles.bg} aria-hidden="true" />

      <div className="container">
        {/* Header */}
        <div className={styles.header}>
          <div className="badge badge-primary" style={{ marginBottom: '16px' }}>
            What We Analyze
          </div>
          <h2 className={styles.title}>
            Everything That Impacts Your{' '}
            <span className="gradient-text">Conversion Rate</span>
          </h2>
          <p className={styles.subtitle}>
            Our AI examines 6 critical conversion factors and delivers
            specific, actionable recommendations for each.
          </p>
        </div>

        {/* Feature Grid */}
        <div className={styles.grid}>
          {features.map((feature, i) => (
            <div
              key={i}
              className={`card ${styles.featureCard}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className={styles.iconWrapper} style={{ '--icon-color': feature.color } as React.CSSProperties}>
                {feature.icon}
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={styles.bottomCta}>
          <div className={styles.statsRow}>
            {[
              { num: '< 30s', label: 'Audit time' },
              { num: '6', label: 'Factors analyzed' },
              { num: '100', label: 'Max score' },
            ].map((stat, i) => (
              <div key={i} className={styles.stat}>
                <span className={styles.statNum}>{stat.num}</span>
                <span className={styles.statLabel}>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
