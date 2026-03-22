import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const rawLocale = searchParams.get('locale') ?? 'en'
  const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : 'en'
  const prefix = locale === 'en' ? '' : `/${locale}`

  const errorRedirect = NextResponse.redirect(`${origin}${prefix}/auth/login?error=auth_error`)

  if (!code) return errorRedirect

  // We need to know the redirect URL before creating the response,
  // so we collect cookies during exchange and apply them to the final response.
  const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll: (toSet) => toSet.forEach((c) => pendingCookies.push(c as any)),
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return errorRedirect

  const { data: { user } } = await supabase.auth.getUser()
  let redirectUrl = `${origin}${prefix}${next}`

  if (user) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('slug')
      .eq('id', user.id)
      .single() as { data: { slug: string } | null }
    if (profile?.slug?.startsWith('user-')) {
      redirectUrl = `${origin}${prefix}/dashboard/complete-profile`
    }
  }

  const response = NextResponse.redirect(redirectUrl)
  pendingCookies.forEach(({ name, value, options }) =>
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2])
  )
  return response
}
