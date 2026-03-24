import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

const intlMiddleware = createIntlMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1. Handle i18n routing
  const intlResponse = intlMiddleware(request)
  const response = intlResponse || NextResponse.next({ request })

  // 2. Refresh the Supabase session if it exists (keeps auth cookies up to date)
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

  // getUser() validates the token server-side and refreshes it if needed.
  // On concurrent requests the same refresh token can be used twice; catch
  // that case and sign out so the browser gets a clean session.
  const { error } = await supabase.auth.getUser()
  if (error?.code === 'refresh_token_already_used') {
    await supabase.auth.signOut()
  }

  return response
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
