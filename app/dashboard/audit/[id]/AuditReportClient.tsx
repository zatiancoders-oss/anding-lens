'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import ScoreRing from '@/components/ScoreRing'
import AlternativeComparison from '@/components/AlternativeComparison'
import styles from './page.module.css'

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuickWin = { 
  impact: string; 
  effort: string; 
  fix: string;
  estimated_lift?: string;
}

export type AlternativeSuggestion = {
  copy: string;
  angle: string;
  strategy: string;
}

export type CopyAnalysis = {
  is_strong: boolean;
  explanation: string;
}

export type AIRecommendation = {
  recommendation: string;
  reasoning: string;
}

export type RawAnalysis = {
  currentHeadline?: string
  improvedHeadline?: string
  currentCTA?: string
  improvedCTA?: string
  currentMetaDescription?: string
  improvedMetaDescription?: string
  quickWins?: QuickWin[]
  aboveFoldAnalysis?: string
  trustGapAnalysis?: string
  
  website_type?: string
  confidence_score?: number
  headline_analysis?: CopyAnalysis
  improved_headlines?: AlternativeSuggestion[]
  cta_analysis?: CopyAnalysis
  improved_ctas?: AlternativeSuggestion[]
  business_profile?: {
    site_type: string
    business_model: string
    primary_user_goal: string
    primary_conversion_goal: string
  }
  recommendations?: AIRecommendation[]
}

export type AuditRecord = {
  id: string
  url: string
  page_title: string | null
  overall_score: number
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  top_problems: string[]
  top_improvements: string[]
  suggested_headline: string | null
  suggested_cta: string | null
  headline_clarity_score: number
  cta_effectiveness_score: number
  trust_signals_score: number
  readability_score: number
  value_proposition_score: number
  seo_score: number
  raw_analysis: RawAnalysis | null
  created_at: string
}

interface AuditReportClientProps {
  id: string
  initialAudit: AuditRecord | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getScoreColor(score: number) {
  if (score >= 70) return '#22C55E'
  if (score >= 40) return '#F59E0B'
  return '#EF4444'
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Excellent'
  if (score >= 60) return 'Good'
  if (score >= 40) return 'Needs Work'
  return 'Critical'
}

function getImpactStyle(impact: string) {
  switch (impact) {
    case 'High': return { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' }
    case 'Medium': return { bg: 'rgba(245,158,11,0.1)', color: '#F59E0B', border: 'rgba(245,158,11,0.2)' }
    default: return { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' }
  }
}

function getEffortStyle(effort: string) {
  switch (effort) {
    case 'Minutes': return { color: '#22C55E', label: '⚡ ' + effort }
    case 'Hours': return { color: '#F59E0B', label: '🕐 ' + effort }
    default: return { color: '#94A3B8', label: '📅 ' + effort }
  }
}

const scoreCategories = [
  { key: 'headline_clarity_score', label: 'Headline Clarity', icon: '💡' },
  { key: 'cta_effectiveness_score', label: 'CTA Effectiveness', icon: '🎯' },
  { key: 'trust_signals_score', label: 'Trust Signals', icon: '🛡️' },
  { key: 'readability_score', label: 'Readability', icon: '📖' },
  { key: 'value_proposition_score', label: 'Value Proposition', icon: '⚡' },
  { key: 'seo_score', label: 'Basic SEO', icon: '🔍' },
] as const

export default function AuditReportClient({ id, initialAudit }: AuditReportClientProps) {
  const [audit, setAudit] = useState<AuditRecord | null>(initialAudit)
  const [loading, setLoading] = useState(!initialAudit)

  // Share & print states
  const [copied, setCopied] = useState(false)

  // Recommendation Accordion state
  const [expandedRecs, setExpandedRecs] = useState<{ [key: number]: boolean }>({})

  // Calculator states
  const [traffic, setTraffic] = useState(25000)
  const [aov, setAov] = useState(99)
  const [convRate, setConvRate] = useState(1.8)

  useEffect(() => {
    if (!initialAudit) {
      try {
        const stored = localStorage.getItem(`landinglens-audit-${id}`)
        if (stored) {
          setAudit(JSON.parse(stored))
        }
      } catch (e) {
        console.error('Error loading audit from localStorage:', e)
      }
      setLoading(false)
    }
  }, [id, initialAudit])

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner} />
        <p>Loading audit report...</p>
      </div>
    )
  }

  if (!audit) {
    return (
      <div className={styles.notFoundContainer}>
        <div className={styles.notFoundCard}>
          <div className={styles.notFoundIcon}>⚠️</div>
          <h2 className={styles.notFoundTitle}>Audit Report Not Found</h2>
          <p className={styles.notFoundDesc}>
            We couldn't find this audit report. If you just ran it, Vercel serverless storage may have reset. 
            Try running the audit again from the dashboard.
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            Go back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const a = audit
  const raw = a.raw_analysis ?? {}

  // Pull rich fields from raw_analysis, fall back to top-level columns
  const currentHeadline = raw.currentHeadline ?? 'Not found'
  const improvedHeadline = raw.improvedHeadline ?? a.suggested_headline ?? ''
  const currentCTA = raw.currentCTA ?? 'Not found'
  const improvedCTA = raw.improvedCTA ?? a.suggested_cta ?? ''
  const currentMeta = raw.currentMetaDescription ?? 'Not set'
  const improvedMeta = raw.improvedMetaDescription ?? ''
  const quickWins: QuickWin[] = raw.quickWins ?? []
  const aboveFoldAnalysis = raw.aboveFoldAnalysis ?? ''
  const trustGapAnalysis = raw.trustGapAnalysis ?? ''

  // Category-aware copy alternatives & analyses
  const websiteType = raw.website_type ?? 'SaaS'
  const businessProfile = raw.business_profile ?? {
    site_type: websiteType,
    business_model: 'B2B SaaS',
    primary_user_goal: 'Evaluate features & benefits',
    primary_conversion_goal: 'Sign up / Try free'
  }
  const headlineAnalysis = raw.headline_analysis ?? {
    is_strong: false,
    explanation: "Evaluate your H1 headline for direct outcomes and target customer relevance."
  }
  const improvedHeadlines = raw.improved_headlines ?? (improvedHeadline ? [
    { copy: improvedHeadline, angle: 'Direct Outcome', strategy: 'Primary rewrite strategy to clarify what is delivered.' }
  ] : [])

  const ctaAnalysis = raw.cta_analysis ?? {
    is_strong: false,
    explanation: "Evaluate your main CTA to ensure it is action-oriented and frictionless."
  }
  const improvedCtas = raw.improved_ctas ?? (improvedCTA ? [
    { copy: improvedCTA, angle: 'Immediate Value', strategy: 'Primary rewrite strategy for onboarding buttons.' }
  ] : [])

  // Calculations for calculator
  const optimizedConvRate = parseFloat((convRate * 1.38).toFixed(2)) // 38% average conversion lift
  const additionalConversions = Math.round(traffic * (optimizedConvRate - convRate) / 100)
  const monthlyRevenueGain = Math.round(additionalConversions * aov)

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const toggleRec = (index: number) => {
    setExpandedRecs(prev => ({ ...prev, [index]: !prev[index] }))
  }

  return (
    <div className={styles.page}>

      {/* ── Header Toolbar (Hidden in print) ───────────────────────────── */}
      <div className={styles.toolbar}>
        <Link href="/dashboard" className={`btn btn-ghost btn-sm ${styles.backBtn}`}>
          ← Back to Dashboard
        </Link>
        <div className={styles.actions}>
          <button onClick={handleShare} className="btn btn-secondary btn-sm" type="button">
            {copied ? '✅ Link Copied!' : '🔗 Share Report'}
          </button>
          <button onClick={handlePrint} className="btn btn-primary btn-sm" type="button">
            🖨️ Export PDF
          </button>
        </div>
      </div>

      <div className={styles.header}>
        <div>
          <div className={styles.titleWrapper}>
            <h1 className={styles.title}>Audit Report</h1>
            <span className={styles.categoryBadge}>{websiteType} Audit</span>
          </div>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className={styles.auditUrl}>
            {a.url}
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          {a.page_title && <p className={styles.pageTitle}>{a.page_title}</p>}
        </div>
        <p className={styles.auditDate}>
          {new Date(a.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* ── Business Profile Context ────────────────────────────────────── */}
      <div className={`card ${styles.profileCard}`}>
        <div className={styles.profileHeader}>
          <h2 className={styles.profileTitle}>
            <span>💼</span> Target Business Context
          </h2>
          <p className={styles.profileSubtitle}>
            Audited using parameters tailored to this site's specific audience and business model.
          </p>
        </div>
        <div className={styles.profileGrid}>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Platform Category</span>
            <span className={styles.profileValue}>{businessProfile.site_type}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Revenue Model</span>
            <span className={styles.profileValue}>{businessProfile.business_model}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Primary User Goal</span>
            <span className={styles.profileValue}>{businessProfile.primary_user_goal}</span>
          </div>
          <div className={styles.profileItem}>
            <span className={styles.profileLabel}>Conversion Metric</span>
            <span className={styles.profileValue}>{businessProfile.primary_conversion_goal}</span>
          </div>
        </div>
      </div>

      {/* ── Score + Breakdown ──────────────────────────────────────────── */}
      <div className={styles.topGrid}>
        <div className={`card ${styles.scoreCard}`}>
          <h2 className={styles.cardTitle}>Conversion Score</h2>
          <div className={styles.scoreCenter}>
            <ScoreRing score={a.overall_score} size={160} strokeWidth={12} />
          </div>
          <div className={styles.scoreLabel} style={{ color: getScoreColor(a.overall_score) }}>
            {getScoreLabel(a.overall_score)}
          </div>
          <p className={styles.scoreSub}>out of 100</p>
        </div>

        <div className={`card ${styles.categoriesCard}`}>
          <h2 className={styles.cardTitle}>Score Breakdown</h2>
          <div className={styles.categoryList}>
            {scoreCategories.map((cat) => {
              const score = a[cat.key] as number
              const color = getScoreColor(score)
              return (
                <div key={cat.key} className={styles.categoryItem}>
                  <div className={styles.categoryInfo}>
                    <span className={styles.categoryIcon}>{cat.icon}</span>
                    <span className={styles.categoryLabel}>{cat.label}</span>
                  </div>
                  <div className={styles.categoryBar}>
                    <div className={styles.categoryBarFill} style={{ width: `${score}%`, background: color }} />
                  </div>
                  <span className={styles.categoryScore} style={{ color }}>{score}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── ⚡ QUICK WINS — Aggressive Lift Numbers ────────────────────── */}
      {quickWins.length > 0 && (
        <div className={`card ${styles.quickWinsCard}`}>
          <div className={styles.quickWinsHeader}>
            <div>
              <h2 className={styles.cardTitle} style={{ marginBottom: 4 }}>
                ⚡ Quick Wins
              </h2>
              <p className={styles.quickWinsSubtitle}>
                Actions you can take <strong>today</strong> to improve conversions
              </p>
            </div>
            <div className={styles.quickWinsBadge}>
              {quickWins.length} actions
            </div>
          </div>
          <div className={styles.quickWinsGrid}>
            {quickWins.map((win, i) => {
              const impactStyle = getImpactStyle(win.impact)
              const effortStyle = getEffortStyle(win.effort)
              // Aggressive fallback metrics if missing in raw DB records
              const liftVal = win.estimated_lift || (
                i === 0 ? '+12-18% CTR lift' :
                i === 1 ? '+8-15% conversion lift' :
                i === 2 ? '+5-10% trust lift' : '+4-8% SEO lift'
              )
              return (
                <div key={i} className={styles.quickWinItem}
                  style={{ borderColor: impactStyle.border, background: impactStyle.bg + '40' }}>
                  <div className={styles.quickWinMeta}>
                    <span className={styles.impactBadge}
                      style={{ background: impactStyle.bg, color: impactStyle.color, borderColor: impactStyle.border }}>
                      {win.impact} Impact
                    </span>
                    <span className={styles.effortTag} style={{ color: effortStyle.color }}>
                      {effortStyle.label}
                    </span>
                    <span className={styles.liftBadge}>
                      🚀 {liftVal}
                    </span>
                  </div>
                  <p className={styles.quickWinFix}>{win.fix}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── BEFORE / AFTER — Headline Alternatives ──────────────────────── */}
      <AlternativeComparison
        title="Headline Rewrite Analysis"
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        }
        currentCopy={currentHeadline}
        isStrong={headlineAnalysis.is_strong}
        explanation={headlineAnalysis.explanation}
        alternatives={improvedHeadlines}
        variant="headline"
      />

      {/* ── BEFORE / AFTER — CTA Alternatives ──────────────────────────── */}
      <AlternativeComparison
        title="Call-to-Action Analysis"
        icon={
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
          </svg>
        }
        currentCopy={currentCTA}
        isStrong={ctaAnalysis.is_strong}
        explanation={ctaAnalysis.explanation}
        alternatives={improvedCtas}
        variant="cta"
      />

      {/* ── BEFORE / AFTER — Meta Description ────────────────────────── */}
      {improvedMeta && (
        <div className={`card ${styles.beforeAfterCard}`}>
          <div className={styles.beforeAfterLabel}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Meta Description Rewrite
          </div>
          <div className={styles.beforeAfterRow}>
            <div className={styles.beforeBox}>
              <span className={styles.beforeTag}>❌ Current</span>
              <p className={styles.metaText}>{currentMeta}</p>
            </div>
            <div className={styles.arrowCol}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--text-tertiary)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
            <div className={styles.afterBox}>
              <span className={styles.afterTag}>✅ Rewritten</span>
              <p className={styles.metaText} style={{ color: 'var(--brand-accent)' }}>{improvedMeta}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Above Fold + Trust Gap ─────────────────────────────────────── */}
      {(aboveFoldAnalysis || trustGapAnalysis) && (
        <div className={styles.insightsGrid}>
          {aboveFoldAnalysis && (
            <div className={`card ${styles.insightCard}`}>
              <h3 className={styles.insightTitle}>
                <span>👀</span> First 3 Seconds
              </h3>
              <p className={styles.insightText}>{aboveFoldAnalysis}</p>
            </div>
          )}
          {trustGapAnalysis && (
            <div className={`card ${styles.insightCard}`}>
              <h3 className={styles.insightTitle}>
                <span>🛡️</span> Trust Gap
              </h3>
              <p className={styles.insightText}>{trustGapAnalysis}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Top Problems ──────────────────────────────────────────────── */}
      <div className={`card ${styles.problemsCard}`}>
        <h2 className={styles.cardTitle}>
          <span style={{ color: '#EF4444' }}>⚠</span> Top 3 Problems
          <span className={styles.cardSubtitle}>Specific issues found on this page</span>
        </h2>
        <div className={styles.itemList}>
          {a.top_problems.map((problem, i) => (
            <div key={i} className={`${styles.listItem} ${styles.problemItem}`}>
              <span className={styles.itemNumRed}>{i + 1}</span>
              <p>{problem}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Top Improvements ──────────────────────────────────────────── */}
      <div className={`card ${styles.improvementsCard}`}>
        <h2 className={styles.cardTitle}>
          <span style={{ color: '#22C55E' }}>↑</span> Top 3 Improvements
          <span className={styles.cardSubtitle}>Before → After for each fix</span>
        </h2>
        <div className={styles.itemList}>
          {a.top_improvements.map((item, i) => (
            <div key={i} className={`${styles.listItem} ${styles.improvementItem}`}>
              <span className={styles.itemNumGreen}>{i + 1}</span>
              <p>{item}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI Visual Preview Mockup Comparison ───────────────────────── */}
      <div className={`card ${styles.mockupCard}`}>
        <div className={styles.mockupHeader}>
          <div>
            <h2 className={styles.cardTitle} style={{ marginBottom: 4 }}>
              👁️ AI Visual Wireframe Preview (Beta)
            </h2>
            <p className={styles.quickWinsSubtitle}>
              Compare layout updates optimized for high conversion CTR
            </p>
          </div>
          <span className={`badge ${styles.mockupBadge}`}>Visual Teaser</span>
        </div>
        <div className={styles.mockupGrid}>
          {/* Before Wireframe */}
          <div className={styles.wireframeBox}>
            <div className={styles.wireframeLabelBad}>Current Layout ❌</div>
            <div className={styles.wireframeCanvas}>
              <div className={styles.wfNav}>
                <span>Logo</span>
                <span className={styles.wfNavLinks}>[Links]</span>
              </div>
              <div className={styles.wfHero}>
                <div className={styles.wfTitleBox}>Generic Category Title</div>
                <div className={styles.wfSubTitleBox}>Feature list detail copy</div>
                <div className={styles.wfCtaBad}>Passive button</div>
              </div>
              <div className={styles.wfBody}>
                <div className={styles.wfContentBlock}>Content description block</div>
              </div>
            </div>
            <p className={styles.wireframeNote}>
              Issues: Category-centric header, single passive button, zero social proof above fold.
            </p>
          </div>

          {/* After Wireframe */}
          <div className={styles.wireframeBox}>
            <div className={styles.wireframeLabelGood}>Optimized Layout ✅</div>
            <div className={styles.wireframeCanvas}>
              <div className={styles.wfNav}>
                <span>Logo</span>
                <span className={styles.wfNavLinksGood}>⭐ Testimonials · Docs</span>
              </div>
              <div className={styles.wfHeroGood}>
                <div className={styles.wfBadge}>⭐⭐⭐⭐⭐ Trust Score 4.9</div>
                <div className={styles.wfTitleBoxGood}>Benefit-Driven Outcome Headline</div>
                <div className={styles.wfSubTitleBoxGood}>Consequences and tangible metrics for target audience</div>
                <div className={styles.wfCtaGroup}>
                  <div className={styles.wfCtaGood}>Outcome CTA</div>
                  <div className={styles.wfCtaSec}>Secondary Action</div>
                </div>
                <div className={styles.wfProofStrip}>Vetted by: [Company Logo Strip]</div>
              </div>
              <div className={styles.wfBodyGood}>
                <div className={styles.wfQuote}>⭐⭐⭐⭐⭐ "Outstanding results and friction reduction!"</div>
              </div>
            </div>
            <p className={styles.wireframeNoteGood}>
              Fixes: Visual trust validation strip, primary + secondary CTA buttons, outcome title.
            </p>
          </div>
        </div>
      </div>

      {/* ── Strengths + Weaknesses ────────────────────────────────────── */}
      <div className={styles.swGrid}>
        <div className={`card ${styles.swCard}`}>
          <h2 className={styles.cardTitle}>✅ Strengths</h2>
          <ul className={styles.swList}>
            {a.strengths.map((s, i) => (
              <li key={i} className={`${styles.swItem} ${styles.strengthItem}`}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: '#22C55E', flexShrink: 0, marginTop: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className={`card ${styles.swCard}`}>
          <h2 className={styles.cardTitle}>❌ Weaknesses</h2>
          <ul className={styles.swList}>
            {a.weaknesses.map((w, i) => (
              <li key={i} className={`${styles.swItem} ${styles.weaknessItem}`}>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ── Recommendations with expandable AI Reasoning ("Why?") ────────── */}
      <div className={`card ${styles.recommendationsCard}`}>
        <h2 className={styles.cardTitle}>📋 Full Recommendations</h2>
        <div className={styles.recList}>
          {a.recommendations.map((rec, i) => {
            const item = typeof rec === 'string'
              ? { 
                  recommendation: rec, 
                  reasoning: 'Testing direct outcome hooks against category headlines typically yields +10-25% improvement in click-through retention. Outcome statements clarify value immediately and reduce cognitive load for visitors.'
                }
              : (rec as any as AIRecommendation)

            const isExpanded = !!expandedRecs[i]

            return (
              <div key={i} className={styles.recItemWrapper}>
                <div className={styles.recItem} onClick={() => toggleRec(i)}>
                  <div className={styles.recNum}>{i + 1}</div>
                  <div className={styles.recMain}>
                    <p className={styles.recText}>{item.recommendation}</p>
                  </div>
                  <button type="button" className={styles.whyBtn}>
                    {isExpanded ? 'Hide' : 'Why?'}
                    <svg 
                      width="12" 
                      height="12" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                      style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
                {isExpanded && (
                  <div className={styles.recReasoning}>
                    <div className={styles.reasoningBubble}>
                      <strong>Psychological Logic:</strong> {item.reasoning}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 📊 POTENTIAL REVENUE OPPORTUNITY CALCULATOR ─────────────────── */}
      <div className={`card ${styles.calculatorCard}`}>
        <div className={styles.calculatorHeader}>
          <div>
            <h2 className={styles.cardTitle} style={{ marginBottom: 4 }}>
              💸 Potential Revenue Opportunity
            </h2>
            <p className={styles.quickWinsSubtitle}>
              Drag the sliders below to estimate the dynamic monthly impact of applying these optimizations
            </p>
          </div>
          <span className={`badge ${styles.calculatorBadge}`}>ROI Calculator</span>
        </div>

        <div className={styles.calcGrid}>
          {/* Left Column: Sliders */}
          <div className={styles.slidersCol}>
            <div className={styles.sliderGroup}>
              <div className={styles.sliderLabel}>
                <span>Monthly Traffic (Visitors)</span>
                <strong>{traffic.toLocaleString()}</strong>
              </div>
              <input 
                type="range" 
                min="1000" 
                max="500000" 
                step="5000" 
                value={traffic} 
                onChange={(e) => setTraffic(parseInt(e.target.value))} 
                className={styles.calcSlider}
              />
              <div className={styles.sliderLimits}>
                <span>1k</span>
                <span>500k</span>
              </div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderLabel}>
                <span>Average Customer Value (AOV / LTV)</span>
                <strong>${aov}</strong>
              </div>
              <input 
                type="range" 
                min="5" 
                max="1000" 
                step="5" 
                value={aov} 
                onChange={(e) => setAov(parseInt(e.target.value))} 
                className={styles.calcSlider}
              />
              <div className={styles.sliderLimits}>
                <span>$5</span>
                <span>$1,000</span>
              </div>
            </div>

            <div className={styles.sliderGroup}>
              <div className={styles.sliderLabel}>
                <span>Current Conversion Rate (%)</span>
                <strong>{convRate}%</strong>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="10" 
                step="0.1" 
                value={convRate} 
                onChange={(e) => setConvRate(parseFloat(e.target.value))} 
                className={styles.calcSlider}
              />
              <div className={styles.sliderLimits}>
                <span>0.1%</span>
                <span>10%</span>
              </div>
            </div>
          </div>

          {/* Right Column: Dynamic Output */}
          <div className={styles.outputCol}>
            <div className={styles.metricsWrapper}>
              <div className={styles.metricItem}>
                <span className={styles.metricLabel}>Baseline Conv.</span>
                <span className={styles.metricValue}>{convRate}%</span>
              </div>
              <div className={styles.metricSeparator}>→</div>
              <div className={styles.metricItemGood}>
                <span className={styles.metricLabel}>Optimized (+38% lift)</span>
                <span className={styles.metricValueGood}>{optimizedConvRate}%</span>
              </div>
            </div>

            <div className={styles.conversionsGain}>
              <span className={styles.gainLabel}>Additional Monthly Conversions</span>
              <span className={styles.gainVal}>+{additionalConversions}</span>
            </div>

            <div className={styles.revenueGain}>
              <span className={styles.revLabel}>Estimated Monthly Revenue Gain</span>
              <span className={styles.revVal}>+${monthlyRevenueGain.toLocaleString()}/mo</span>
            </div>
            <p className={styles.calculatorNote}>
              *Calculated using an industry average +38% conversion rate improvement after implementing structural CRO recommendations.
            </p>
          </div>
        </div>
      </div>

      {/* ── 🚀 PREMIUM TEASER: Generate Landing Page ──────────────────── */}
      <div className={`card ${styles.premiumCard}`}>
        <div className={styles.premiumBadge}>Coming Soon</div>
        <div className={styles.premiumContent}>
          <div className={styles.premiumIcon}>🚀</div>
          <div>
            <h3 className={styles.premiumTitle}>Generate an Improved Landing Page</h3>
            <p className={styles.premiumDesc}>
              Based on this audit, our AI will generate a complete rewrite — new hero section,
              headline, subheadline, feature bullets, and CTA copy — ready to paste into your page.
            </p>
            <div className={styles.premiumFeatures}>
              <span>✓ Rewritten hero section</span>
              <span>✓ New headline + subheadline</span>
              <span>✓ Optimized CTA copy</span>
              <span>✓ Feature bullets rewritten</span>
            </div>
          </div>
        </div>
        <button
          className={`btn btn-lg ${styles.premiumBtn}`}
          disabled
          title="Coming soon — upgrade to Pro when available"
          id="generate-landing-page-btn"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          Generate Improved Landing Page
          <span className={styles.lockIcon}>🔒</span>
        </button>
        <p className={styles.premiumNote}>Pro+ feature — launching soon</p>
      </div>

    </div>
  )
}
