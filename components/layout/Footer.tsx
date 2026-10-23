import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getStaticPagesForFooter } from '@/lib/data/static-pages'
import { isSenderConfigured } from '@/lib/sender'
import { CookieSettingsButton } from '@/components/analytics/CookieSettingsButton'
import { SubscribeModalButton } from '@/components/layout/SubscribeModalButton'

const TOPICS = [
  { msgKey: 'topicDecoloniality' as const, slug: 'decoloniality' },
  { msgKey: 'topicSustainability' as const, slug: 'sustainability' },
  { msgKey: 'topicTechnology' as const, slug: 'technology' },
  { msgKey: 'topicEducation' as const, slug: 'education' },
  { msgKey: 'topicResponsibleAI' as const, slug: 'responsible-ai' },
]

const aeonikRegular: React.CSSProperties = {
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: 400,
}

const aeonikRegularBody: React.CSSProperties = {
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: 400,
}

/** `flushTop` removes the gap above the footer (for pages that end in a full-width band) */
export async function Footer({ flushTop = false }: { flushTop?: boolean } = {}) {
  const [t, tNav, locale, supabase] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
    getLocale(),
    createClient(),
  ])

  const footerPages = await getStaticPagesForFooter(supabase, locale)
  const year = new Date().getFullYear()
  // Each list is in alphabetical order in the reader's language
  const alphabetical = <T extends { label: string }>(links: T[]) => [...links].sort((a, b) => a.label.localeCompare(b.label, locale))

  // Content: the kinds of content plus the magazine's issues
  const contentLinks = alphabetical([
    { href: '/articles', label: tNav('articles') },
    { href: '/videos', label: tNav('videos') },
    { href: '/podcasts', label: tNav('podcasts') },
    { href: '/pills', label: tNav('pills') },
    { href: '/courses', label: tNav('courses') },
    { href: '/issues', label: tNav('issues') },
  ])

  // Pages: the static pages plus the creators directory
  const pageLinks = alphabetical([
    ...footerPages.map((p) => ({ href: `/${p.slug}`, label: p.title })),
    { href: '/creators', label: tNav('creators') },
  ])

  return (
    <footer
      className={`${flushTop ? '' : 'mt-20 '}border-t py-16`}
      style={{ backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mb-12 grid gap-12 md:grid-cols-4">
          <div>
            <div className="mb-4">
              <img src="/logo-untold.png" alt="UNTOLD.ink" style={{ height: 18, width: 'auto' }} />
            </div>
            <p className="text-sm" style={{ ...aeonikRegularBody, color: '#78716C' }}>
              {t('brandTagline')}
            </p>
            <SubscribeModalButton
              label={t('subscribeCta')}
              closeLabel={t('subscribeClose')}
              formTitle={t('subscribeFormTitle')}
              native={isSenderConfigured()}
            />
          </div>
          <div>
            <p
              className="mb-4 text-sm"
              style={{ ...aeonikRegular, color: '#A8A29E' }}
            >
              {t('contentHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {contentLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-[#A9A8E9]"
                    style={aeonikRegularBody}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="mb-4 text-sm"
              style={{ ...aeonikRegular, color: '#A8A29E' }}
            >
              {t('topicsHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {TOPICS.map(({ msgKey, slug }) => (
                <li key={slug}>
                  <Link
                    href={`/tag/${slug}`}
                    className="transition-colors hover:text-[#A9A8E9]"
                    style={aeonikRegularBody}
                  >
                    {t(msgKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="mb-4 text-sm"
              style={{ ...aeonikRegular, color: '#A8A29E' }}
            >
              {t('pagesHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {pageLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-[#A9A8E9]"
                    style={aeonikRegularBody}
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div
          className="border-t pt-8 text-center text-sm"
          style={{ ...aeonikRegularBody, color: '#555', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {t('copyright', { year })}
          <CookieSettingsButton />
        </div>
      </div>
    </footer>
  )
}
