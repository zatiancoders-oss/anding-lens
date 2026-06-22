'use client'

import { useState } from 'react'
import styles from './AlternativeComparison.module.css'

interface AlternativeSuggestion {
  copy: string
  angle: string
  strategy: string
}

interface AlternativeComparisonProps {
  title: string
  icon: React.ReactNode
  currentCopy: string
  isStrong: boolean
  explanation: string
  alternatives: AlternativeSuggestion[]
  variant: 'headline' | 'cta'
}

export default function AlternativeComparison({
  title,
  icon,
  currentCopy,
  isStrong,
  explanation,
  alternatives,
  variant,
}: AlternativeComparisonProps) {
  const [activeTab, setActiveTab] = useState(0)

  if (!alternatives || alternatives.length === 0) return null

  const activeAlternative = alternatives[activeTab] ?? alternatives[0]

  return (
    <div className={`card ${styles.card}`}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          {icon}
          <span className={styles.title}>{title}</span>
        </div>
        {isStrong ? (
          <span className={`badge ${styles.strongBadge}`}>
            <span className={styles.badgeDot}>•</span> Strong Copy Detected
          </span>
        ) : (
          <span className={`badge ${styles.rewriteBadge}`}>
            ⚡ Optimization Opportunity
          </span>
        )}
      </div>

      {/* Explanation Banner */}
      <div className={styles.explanationSection}>
        <p className={styles.explanationText}>{explanation}</p>
      </div>

      {/* Comparison Grid */}
      <div className={styles.comparisonGrid}>
        {/* Left Column: Current Copy */}
        <div className={styles.beforeBox}>
          <span className={styles.boxTag}>❌ Current Copy</span>
          <div className={styles.previewContainer}>
            {variant === 'headline' ? (
              <p className={styles.headlinePreview}>&ldquo;{currentCopy}&rdquo;</p>
            ) : (
              <div className={styles.ctaPreviewBad}>{currentCopy}</div>
            )}
          </div>
        </div>

        {/* Arrow Column */}
        <div className={styles.arrowCol}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </div>

        {/* Right Column: Rewritten Alternatives */}
        <div className={styles.afterBox}>
          <div className={styles.afterHeader}>
            <span className={styles.boxTagGood}>✅ Suggested Alternatives</span>
            {/* Tabs for Options */}
            <div className={styles.tabs}>
              {alternatives.map((alt, index) => (
                <button
                  key={index}
                  className={`${styles.tabButton} ${activeTab === index ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(index)}
                  type="button"
                >
                  Option {String.fromCharCode(65 + index)}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.previewContainer}>
            {variant === 'headline' ? (
              <p className={styles.headlinePreviewGood}>&ldquo;{activeAlternative.copy}&rdquo;</p>
            ) : (
              <div className={styles.ctaPreviewGood}>{activeAlternative.copy}</div>
            )}
          </div>

          {/* Strategy Details */}
          <div className={styles.strategyDetails}>
            <div className={styles.strategyMeta}>
              <span className={styles.angleTag}>⚡ {activeAlternative.angle}</span>
            </div>
            <p className={styles.strategyText}>{activeAlternative.strategy}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
