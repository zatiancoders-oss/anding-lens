import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import UrlAuditForm from '@/components/UrlAuditForm'
import styles from './page.module.css'

function getScoreColor(score: number) {
  if (score >= 70) return 'score-high'
  if (score >= 40) return 'score-medium'
  return 'score-low'
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

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch recent audits
  const { data: recentAudits } = await supabase
    .from('audits')
    .select('id, url, overall_score, created_at, page_title')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const auditsList = (recentAudits ?? []) as Array<{
    id: string
    url: string
    overall_score: number
    created_at: string
    page_title: string | null
  }>


  const isPro = profile?.plan === 'pro'
  const auditCount = profile?.audit_count_this_month ?? 0
  const remaining = isPro ? Infinity : Math.max(0, 3 - auditCount)

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Audit a landing page to find conversion opportunities</p>
        </div>
        <div className={`card ${styles.planBadge}`}>
          <span className={`badge ${isPro ? 'badge-primary' : ''}`} style={!isPro ? { background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' } : {}}>
            {isPro ? '⚡ Pro Plan' : '🆓 Free Plan'}
          </span>
          <span className={styles.planInfo}>
            {isPro ? 'Unlimited audits' : `${remaining} audit${remaining !== 1 ? 's' : ''} remaining`}
          </span>
        </div>
      </div>

      {/* URL Form */}
      <div className={`card ${styles.formCard}`}>
        <h2 className={styles.formTitle}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          New Audit
        </h2>
        <UrlAuditForm canAudit={isPro || remaining > 0} />
        {!isPro && remaining === 0 && (
          <div className={styles.limitMsg}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            You&apos;ve used all 3 free audits this month.{' '}
            <Link href="/#pricing" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
              Upgrade to Pro
            </Link>{' '}
            for unlimited audits.
          </div>
        )}
      </div>

      {/* Recent Audits */}
      {auditsList.length > 0 && (
        <div className={styles.recentSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Recent Audits</h2>
            <Link href="/dashboard/history" className="btn btn-ghost btn-sm">
              View all →
            </Link>
          </div>

          <div className={styles.auditList}>
            {auditsList.map((audit) => (
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
      )}

      {/* Empty state */}
      {(!recentAudits || recentAudits.length === 0) && (
        <div className={`card ${styles.emptyState}`}>
          <div className={styles.emptyIcon}>🔍</div>
          <h3 className={styles.emptyTitle}>No audits yet</h3>
          <p className={styles.emptyDesc}>
            Submit your first landing page URL above to get started.
          </p>
        </div>
      )}
    </div>
  )
}
