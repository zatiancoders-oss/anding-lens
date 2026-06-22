import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import styles from './page.module.css'

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

export default async function HistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: audits } = await supabase
    .from('audits')
    .select('id, url, overall_score, created_at, page_title, headline_clarity_score, cta_effectiveness_score')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const auditsList = (audits ?? []) as Array<{
    id: string
    url: string
    overall_score: number
    created_at: string
    page_title: string | null
    headline_clarity_score: number
    cta_effectiveness_score: number
  }>

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Audit History</h1>
          <p className={styles.subtitle}>
            {auditsList.length} total audit{auditsList.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-primary btn-sm" id="history-new-audit-btn">
          + New Audit
        </Link>
      </div>

      {auditsList.length > 0 ? (
        <div className={styles.grid}>
          {auditsList.map((audit) => (
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
