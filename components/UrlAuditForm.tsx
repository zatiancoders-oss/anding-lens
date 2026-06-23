'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import styles from './UrlAuditForm.module.css'

interface UrlAuditFormProps {
  canAudit: boolean
}

export default function UrlAuditForm({ canAudit }: UrlAuditFormProps) {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAudit) return

    // Basic URL validation
    let normalizedUrl = url.trim()
    if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
      normalizedUrl = 'https://' + normalizedUrl
    }

    try {
      new URL(normalizedUrl)
    } catch {
      setError('Please enter a valid URL (e.g. https://example.com)')
      return
    }

    setLoading(true)
    setError(null)
    setProgress('Analyzing website copy with AI... (takes 15-30s)')

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalizedUrl }),
      })

      if (!res.ok) {
        let errorMsg = 'Audit failed. Please try again.'
        try {
          const data = await res.json()
          errorMsg = data.error || errorMsg
        } catch (e) {
          if (res.status === 504) {
            errorMsg = 'The audit request timed out. The OpenRouter free model took too long to respond. Please try again.'
          } else {
            errorMsg = `Server error (${res.status}). Please check your API key or try again.`
          }
        }
        throw new Error(errorMsg)
      }

      const data = await res.json()
      
      // Save full audit result to localStorage for Vercel bypass compatibility
      if (data.audit) {
        try {
          localStorage.setItem(`landinglens-audit-${data.auditId}`, JSON.stringify(data.audit))
        } catch (e) {
          console.error('Failed to write audit to localStorage:', e)
        }
      }

      setProgress('Redirecting to report...')
      router.push(`/dashboard/audit/${data.auditId}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(false)
      setProgress(null)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <div className={styles.inputIcon}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
          </div>
          <input
            id="audit-url-input"
            type="text"
            value={url}
            onChange={(e) => { setUrl(e.target.value); setError(null) }}
            className={`input input-lg ${styles.urlInput}`}
            placeholder="https://yourlandingpage.com"
            disabled={loading || !canAudit}
            autoComplete="url"
          />
        </div>

        <button
          type="submit"
          className={`btn btn-primary btn-lg ${styles.submitBtn}`}
          disabled={loading || !canAudit || !url.trim()}
          id="audit-submit-btn"
        >
          {loading ? (
            <>
              <span className={styles.spinner} />
              {progress ?? 'Analyzing...'}
            </>
          ) : (
            <>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Run AI Audit
            </>
          )}
        </button>
      </form>

      {error && (
        <div className={styles.error} role="alert">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading && (
        <div className={styles.progressBar}>
          <div className={styles.progressFill} />
        </div>
      )}

      <p className={styles.hint}>
        Works on any publicly accessible URL. Results in ~15–30 seconds.
      </p>
    </div>
  )
}
