import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'
import { disabledLocaleRedirectPath, normalizeEnabledLocales, LANGUAGE_CATALOG } from './lib/languages'

const intlMiddleware = createIntlMiddleware(routing)

// Which languages are switched on (Admin → Settings → Languages). Read from the public settings row,
// remembered for a minute per server instance so this costs almost nothing. If it can't be read,
// every language stays on rather than locking visitors out.
let enabledCache: { at: number; locales: string[] } | null = null
async function loadEnabledLocales(): Promise<string[]> {
  if (enabledCache && Date.now() - enabledCache.at < 60_000) return enabledCache.locales
  let locales = LANGUAGE_CATALOG.map((l) => l.code as string)
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/platform_settings?id=eq.default&select=settings`,
      {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        signal: AbortSignal.timeout(2500),
      },
    )
    if (res.ok) {
      const rows = await res.json()
      locales = normalizeEnabledLocales(rows?.[0]?.settings?.languages?.enabled)
    }
  } catch {
    // keep all languages on
  }
  enabledCache = { at: Date.now(), locales }
  return locales
}

export async function proxy(request: NextRequest) {
  // 0. A language that is switched off: send the visitor to the same page in the default language
  const firstSegment = request.nextUrl.pathname.split('/')[1]
  if (firstSegment && firstSegment !== routing.defaultLocale && (routing.locales as readonly string[]).includes(firstSegment)) {
    const target = disabledLocaleRedirectPath(request.nextUrl.pathname, await loadEnabledLocales())
    if (target) {
      const url = request.nextUrl.clone()
      url.pathname = target
      const redirect = NextResponse.redirect(url, 307)
      // Forget a saved preference for the disabled language, or the language detection would send them straight back
      redirect.cookies.set('NEXT_LOCALE', routing.defaultLocale, { path: '/', maxAge: 60 * 60 * 24 * 365, sameSite: 'lax' })
      return redirect
    }
  }

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
