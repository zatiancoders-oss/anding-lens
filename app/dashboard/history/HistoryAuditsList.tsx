'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import styles from './page.module.css'

interface AuditSummary {
  id: string
  url: string
  overall_score: number
  created_at: string
  page_title: string | null
  headline_clarity_score: number
  cta_effectiveness_score: number
}

interface HistoryAuditsListProps {
  initialAudits: AuditSummary[]
}

function getScoreBadge(score: number) {
  if (score >= 70) return 'badge-success'
  if (score >= 40) return 'badge-warning'
  return 'badge-danger'
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Fair'
  return 'Needs Work'
}

export default function HistoryAuditsList({ initialAudits }: HistoryAuditsListProps) {
  const [audits, setAudits] = useState<AuditSummary[]>(initialAudits)

  useEffect(() => {
    const localAudits: AuditSummary[] = []
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith('landinglens-audit-')) {
          const stored = localStorage.getItem(key)
          if (stored) {
            const parsed = JSON.parse(stored)
            localAudits.push({
              id: parsed.id,
              url: parsed.url,
              overall_score: parsed.overall_score,
              created_at: parsed.created_at,
              page_title: parsed.page_title,
              headline_clarity_score: parsed.headline_clarity_score || 0,
              cta_effectiveness_score: parsed.cta_effectiveness_score || 0,
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to read from localStorage:', e)
    }

    // Merge and deduplicate by id
    const mergedMap = new Map<string, AuditSummary>()
    
    // Add database audits
    initialAudits.forEach((a) => mergedMap.set(a.id, a))
    
    // Merge localStorage audits
    localAudits.forEach((a) => mergedMap.set(a.id, a))
    
    // Sort by date descending
    const mergedList = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
    setAudits(mergedList)
  }, [initialAudits])

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit History</h1>
          <p className={styles.subtitle}>
            {audits.length} total audit{audits.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-primary btn-sm" id="history-new-audit-btn">
          + New Audit
        </Link>
      </div>

      {audits.length > 0 ? (
        <div className={styles.grid}>
          {audits.map((audit) => (
            <Link
              key={audit.id}
              href={`/dashboard/audit/${audit.id}`}
              className={`card ${styles.auditCard}`}
            >
              <div className={styles.cardTop}>
                <div className={styles.urlGroup}>
                  <div className={styles.urlIcon}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <div>
                    <p className={styles.auditUrl}>{audit.url}</p>
                    {audit.page_title && (
                      <p className={styles.auditTitle}>{audit.page_title}</p>
                    )}
                  </div>
                </div>
                <span className={`badge ${getScoreBadge(audit.overall_score)}`}>
                  {audit.overall_score}
                </span>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.scoreLabel} style={{
                  color: audit.overall_score >= 70 ? '#22C55E' : audit.overall_score >= 40 ? '#F59E0B' : '#EF4444'
                }}>
                  {getScoreLabel(audit.overall_score)}
                </span>
                <div className={styles.miniScores}>
                  <span title="Headline Clarity">💡 {audit.headline_clarity_score}</span>
                  <span title="CTA Effectiveness">🎯 {audit.cta_effectiveness_score}</span>
                </div>
                <span className={styles.date}>
                  {new Date(audit.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
              </div>

              <div className={styles.viewBtn}>
                View Report
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={`card ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>📊</div>
          <h3>No audits yet</h3>
          <p>Run your first audit to see it here.</p>
          <Link href="/dashboard" className="btn btn-primary" style={{ marginTop: '16px' }}>
            Start Auditing
          </Link>
        </div>
      )}
    </div>
  )
}
