import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { FileText, Video, Mic, Zap, BookOpen } from 'lucide-react'

const CONTENT_TYPES = [
  { key: 'article', href: '/create/article', Icon: FileText },
  { key: 'video', href: '/create/video', Icon: Video },
  { key: 'podcast', href: '/create/podcast', Icon: Mic },
  { key: 'pill', href: '/create/pill', Icon: Zap },
  { key: 'course', href: '/create/course', Icon: BookOpen },
] as const

export default async function CreatePickerPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('create')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="mb-10 text-center">{t('pickType')}</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {CONTENT_TYPES.map(({ key, href, Icon }) => (
            <Link
              key={key}
              href={href}
              className="group flex items-start gap-4 p-5 rounded-xl transition-colors"
              style={{
                border: '1px solid rgba(139,69,19,0.2)',
                background: 'rgba(245,241,232,0.5)',
              }}
            >
              <Icon
                size={24}
                className="mt-0.5 shrink-0 text-[#C45D3A] group-hover:text-[#A04030] transition-colors"
              />
              <div>
                <p className="font-semibold leading-tight">
                  {t(key as 'article' | 'video' | 'podcast' | 'pill' | 'course')}
                </p>
                <p className="text-sm text-[#6B5F58] mt-1">
                  {t(`${key}Desc` as 'articleDesc' | 'videoDesc' | 'podcastDesc' | 'pillDesc' | 'courseDesc')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </>
  )
}
