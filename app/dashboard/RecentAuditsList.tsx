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
}

interface RecentAuditsListProps {
  initialAudits: AuditSummary[]
}

function getScoreBadge(score: number) {
  if (score >= 70) return 'badge-success'
  if (score >= 40) return 'badge-warning'
  return 'badge-danger'
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function RecentAuditsList({ initialAudits }: RecentAuditsListProps) {
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
            })
          }
        }
      }
    } catch (e) {
      console.error('Failed to read from localStorage:', e)
    }

    // Merge and deduplicate by id
    const mergedMap = new Map<string, AuditSummary>()
    
    // Add initial database audits
    initialAudits.forEach((a) => mergedMap.set(a.id, a))
    
    // Merge localStorage audits
    localAudits.forEach((a) => mergedMap.set(a.id, a))
    
    // Sort by date descending and limit to 5
    const mergedList = Array.from(mergedMap.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
      
    setAudits(mergedList)
  }, [initialAudits])

  if (audits.length === 0) {
    return (
      <div className={`card ${styles.emptyState}`}>
        <div className={styles.emptyIcon}>🔍</div>
        <h3 className={styles.emptyTitle}>No audits yet</h3>
        <p className={styles.emptyDesc}>
          Submit your first landing page URL above to get started.
        </p>
      </div>
    )
  }

  return (
    <div className={styles.recentSection}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Recent Audits</h2>
        <Link href="/dashboard/history" className="btn btn-ghost btn-sm">
          View all →
        </Link>
      </div>

      <div className={styles.auditList}>
        {audits.map((audit) => (
          <Link
            key={audit.id}
            href={`/dashboard/audit/${audit.id}`}
            className={`card ${styles.auditItem}`}
          >
            <div className={styles.auditInfo}>
              <div className={styles.auditIcon}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <p className={styles.auditUrl}>{audit.url}</p>
                {audit.page_title && (
                  <p className={styles.auditTitle}>{audit.page_title}</p>
                )}
                <p className={styles.auditDate}>{formatDate(audit.created_at)}</p>
              </div>
            </div>
            <div className={styles.auditScore}>
              <span className={`badge ${getScoreBadge(audit.overall_score)}`}>
                {audit.overall_score}
              </span>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
