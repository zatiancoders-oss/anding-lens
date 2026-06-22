import { cookies } from 'next/headers'
import fs from 'fs'
import path from 'path'

// 🚧 Set this to true to completely bypass login and use a local database file for testing!
export const BYPASS_AUTH = true

export function isDemoMode() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  return !url || url.includes('your-project-id') || !key || key.includes('your-anon-key-here')
}

// Simple file-based database for offline testing
const DB_FILE = path.join(process.cwd(), 'local_db.json')

function readDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    }
  } catch (e) {}
  return { profiles: {}, audits: [] }
}

function writeDb(db: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8')
  } catch (e) {}
}

class MockBuilder {
  private tableName: string
  private filters: Array<(item: any) => boolean> = []
  private sortField: string = ''
  private sortAscending: boolean = false
  private limitVal: number | null = null
  private singleResult: boolean = false
  private isInsertAction: boolean = false
  private isUpdateAction: boolean = false
  private actionData: any = null

  constructor(tableName: string) {
    this.tableName = tableName
  }

  select(fields: string = '*') {
    return this
  }

  eq(field: string, value: any) {
    this.filters.push((item) => item[field] === value)
    return this
  }

  order(field: string, options?: { ascending?: boolean }) {
    this.sortField = field
    this.sortAscending = options?.ascending ?? false
    return this
  }

  limit(count: number) {
    this.limitVal = count
    return this
  }

  single() {
    this.singleResult = true
    return this
  }

  insert(data: any) {
    this.isInsertAction = true
    this.actionData = data
    return this
  }

  update(data: any) {
    this.isUpdateAction = true
    this.actionData = data
    return this
  }

  async then(resolve: any, reject: any) {
    try {
      const db = readDb()
      const demoUserId = '00000000-0000-0000-0000-000000000000'

      // Initialize the demo profile in the file database
      if (!db.profiles[demoUserId]) {
        db.profiles[demoUserId] = {
          id: demoUserId,
          email: 'demo@landinglens.com',
          plan: 'pro',
          audit_count_this_month: 0,
          audit_reset_date: new Date().toISOString().split('T')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        writeDb(db)
      }

      if (this.isInsertAction) {
        if (this.tableName === 'audits') {
          // Generate an audit ID
          const newId = 'audit-' + Math.random().toString(36).substring(2, 15)
          const newAudit = {
            id: newId,
            created_at: new Date().toISOString(),
            ...this.actionData
          }
          db.audits.push(newAudit)
          writeDb(db)

          if (this.singleResult) {
            return resolve({ data: newAudit, error: null })
          }
          return resolve({ data: [newAudit], error: null })
        }
      }

      if (this.isUpdateAction) {
        if (this.tableName === 'profiles') {
          const profile = db.profiles[demoUserId]
          if (profile) {
            Object.assign(profile, this.actionData)
            writeDb(db)
            return resolve({ data: profile, error: null })
          }
        }
      }

      let dataList: any[] = []
      if (this.tableName === 'profiles') {
        dataList = Object.values(db.profiles)
      } else if (this.tableName === 'audits') {
        dataList = [...db.audits]
      }

      // Apply query filters
      for (const filter of this.filters) {
        dataList = dataList.filter(filter)
      }

      // Apply sorting
      if (this.sortField) {
        dataList.sort((a, b) => {
          const valA = a[this.sortField]
          const valB = b[this.sortField]
          if (valA < valB) return this.sortAscending ? -1 : 1
          if (valA > valB) return this.sortAscending ? 1 : -1
          return 0
        })
      }

      // Apply limit
      if (this.limitVal !== null) {
        dataList = dataList.slice(0, this.limitVal)
      }

      if (this.singleResult) {
        return resolve({ data: dataList[0] || null, error: dataList[0] ? null : { message: 'Not found' } })
      }

      return resolve({ data: dataList, error: null })
    } catch (e: any) {
      return resolve({ data: null, error: { message: e.message } })
    }
  }
}

export async function createClient() {
  const demoUserId = '00000000-0000-0000-0000-000000000000'
  const mockUser = { id: demoUserId, email: 'demo@landinglens.com' }

  // If BYPASS_AUTH is active or Supabase keys are placeholders, return the Mock client
  if (BYPASS_AUTH || isDemoMode()) {
    return {
      auth: {
        getUser: async () => ({ data: { user: mockUser }, error: null }),
        signInWithPassword: async () => ({ data: { user: mockUser }, error: null }),
        signUp: async () => ({ data: { user: mockUser }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: (tableName: string) => new MockBuilder(tableName),
    } as any
  }

  // Fallback to real Supabase
  const { createServerClient } = await import('@supabase/ssr')
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}

