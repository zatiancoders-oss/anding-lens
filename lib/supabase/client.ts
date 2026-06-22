import { createBrowserClient } from '@supabase/ssr'

export const BYPASS_AUTH = true

export function isDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !url || url.includes('your-project-id') || !key || key.includes('your-anon-key-here')
}

export function createClient() {
  const demoUserId = '00000000-0000-0000-0000-000000000000'
  const mockUser = { id: demoUserId, email: 'demo@landinglens.com' }

  if (BYPASS_AUTH || isDemoMode()) {
    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        signInWithPassword: async () => ({ data: { user: mockUser }, error: null }),
        signUp: async () => ({ data: { user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: (tableName: string) => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          order: () => builder,
          limit: () => builder,
          single: () => builder,
          insert: () => builder,
          update: () => builder,
          then: (resolve: any) => resolve({ data: [], error: null }),
        }
        return builder as any
      }
    } as any
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

