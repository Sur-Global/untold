import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { routing } from '@/i18n/routing'
import { notFound } from 'next/navigation'
import { CookieConsent } from '@/components/analytics/CookieConsent'
import { EnabledLocalesProvider } from '@/components/layout/EnabledLocales'
import { getEnabledLocales } from '@/lib/data/enabled-locales'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound()
  const [messages, enabledLocales] = await Promise.all([getMessages(), getEnabledLocales()])

  return (
    <NextIntlClientProvider messages={messages}>
      <EnabledLocalesProvider locales={enabledLocales}>
        {children}
        <CookieConsent />
      </EnabledLocalesProvider>
    </NextIntlClientProvider>
  )
}
