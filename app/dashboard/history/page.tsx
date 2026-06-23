import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import HistoryAuditsList from './HistoryAuditsList'

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

  return <HistoryAuditsList initialAudits={auditsList} />
}
