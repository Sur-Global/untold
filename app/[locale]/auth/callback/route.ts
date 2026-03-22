import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da', 'qu']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const rawLocale = searchParams.get('locale') ?? 'en'
  const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : 'en'
  const prefix = locale === 'en' ? '' : `/${locale}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('slug, display_name')
          .eq('id', user.id)
          .single() as { data: { slug: string; display_name: string } | null }
        if (profile?.slug?.startsWith('user-')) {
          return NextResponse.redirect(`${origin}${prefix}/dashboard/complete-profile`)
        }
      }
      return NextResponse.redirect(`${origin}${prefix}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}${prefix}/auth/login?error=auth_error`)
}
