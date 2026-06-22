import { NextResponse, type NextRequest } from 'next/server'

// 🚧 AUTH DISABLED FOR TESTING — re-enable by restoring proxy logic
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/dashboard/:path*', '/auth/:path*'],
}
