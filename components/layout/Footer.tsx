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
      style={{ backgroundColor: '#0D0D0D', borderColor: 'rgba(160,82,45,0.15)' }}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`mb-12 grid gap-12 ${gridCols}`}>
          <div>
            <h4 className="mb-4" style={{ color: '#E8E6E3', fontFamily: 'Audiowide, sans-serif' }}>
              {t('brandTitle')}
            </h4>
            <p className="text-sm" style={{ color: '#78716C' }}>
              {t('brandTagline')}
            </p>
          </div>
          <div>
            <p
              className="mb-4 font-mono text-sm uppercase tracking-wider"
              style={{ color: '#A8A29E' }}
            >
              {t('contentHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {exploreLinks.map(({ href, label }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-[#A0522D]"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p
              className="mb-4 font-mono text-sm uppercase tracking-wider"
              style={{ color: '#A8A29E' }}
            >
              {t('topicsHeading')}
            </p>
            <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
              {TOPICS.map(({ msgKey, slug }) => (
                <li key={slug}>
                  <Link
                    href={`/tag/${slug}`}
                    className="transition-colors hover:text-[#A0522D]"
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
                className="mb-4 font-mono text-sm uppercase tracking-wider"
                style={{ color: '#A8A29E' }}
              >
                {t('pagesHeading')}
              </p>
              <ul className="space-y-3 text-sm" style={{ color: '#78716C' }}>
                {footerPages.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/${p.slug}`}
                      className="transition-colors hover:text-[#A0522D]"
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
          style={{ color: '#78716C', borderColor: 'rgba(160,82,45,0.15)' }}
        >
          {t('copyright', { year })}
        </div>
      </div>
    </footer>
  )
}
