import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AuditReportClient from './AuditReportClient'

export default async function AuditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Attempt to fetch the audit from the database
  const { data: audit } = await supabase
    .from('audits')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  return <AuditReportClient id={id} initialAudit={audit as any} />
}
