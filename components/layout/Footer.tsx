import { getLocale, getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { Link } from '@/i18n/navigation'
import { getStaticPagesForFooter } from '@/lib/data/static-pages'

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

export async function Footer() {
  const [t, tNav, locale, supabase] = await Promise.all([
    getTranslations('footer'),
    getTranslations('nav'),
    getLocale(),
    createClient(),
  ])

  const footerPages = await getStaticPagesForFooter(supabase, locale)
  const year = new Date().getFullYear()
  const exploreLinks = [
    { href: '/articles' as const, label: tNav('articles') },
    { href: '/videos' as const, label: tNav('videos') },
    { href: '/podcasts' as const, label: tNav('podcasts') },
    { href: '/pills' as const, label: tNav('pills') },
    { href: '/courses' as const, label: tNav('courses') },
  ]

  const gridCols =
    footerPages.length > 0 ? 'md:grid-cols-4' : 'md:grid-cols-3'

  return (
    <footer
      className="mt-20 border-t py-16"
      style={{ backgroundColor: '#000', borderColor: 'rgba(255,255,255,0.1)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`mb-12 grid gap-12 ${gridCols}`}>
          <div>
            <div className="mb-4">
              <img src="/logo-untold.png" alt="UNTOLD.ink" style={{ height: 18, width: 'auto' }} />
            </div>
            <p className="text-sm" style={{ ...aeonikRegularBody, color: '#78716C' }}>
              {t('brandTagline')}
            </p>
          </div>
          <div>
            <p
              className="mb-4 text-sm"
              style={{ ...aeonikRegular, color: '#A8A29E' }}
            >
              {t('contentHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {exploreLinks.map(({ href, label }) => (
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
          {footerPages.length > 0 && (
            <div>
              <p
                className="mb-4 text-sm"
                style={{ ...aeonikRegular, color: '#A8A29E' }}
              >
                {t('pagesHeading')}
              </p>
              <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
                {footerPages.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/${p.slug}`}
                      className="transition-colors hover:text-[#A9A8E9]"
                      style={aeonikRegularBody}
                    >
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div
          className="border-t pt-8 text-center text-sm"
          style={{ ...aeonikRegularBody, color: '#555', borderColor: 'rgba(255,255,255,0.1)' }}
        >
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  )
}
