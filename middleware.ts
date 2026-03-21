import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { jwtVerify } from 'jose'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

// Encode the JWT secret once at module level (avoids re-encoding per request)
const jwtSecret = process.env.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET)
  : null

export async function middleware(request: NextRequest) {
  // 1. Handle i18n routing
  const intlResponse = intlMiddleware(request)
  const response = intlResponse || NextResponse.next({ request })

  // 2. Set up Supabase SSR client for cookie management (needed for token refresh cycle)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 3. Read the session from cookies (local decode — no network call)
  const { data: { session } } = await supabase.auth.getSession()

  // 4. Verify the JWT signature locally using SUPABASE_JWT_SECRET
  //    If the token is invalid or tampered, clear the auth cookies immediately.
  if (session?.access_token && jwtSecret) {
    try {
      await jwtVerify(session.access_token, jwtSecret)
    } catch {
      // Token failed cryptographic verification — clear all Supabase auth cookies
      request.cookies.getAll()
        .filter((c) => c.name.startsWith('sb-'))
        .forEach((c) => response.cookies.delete(c.name))
    }
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
