import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { CreatePillForm } from './CreatePillForm'

export default async function CreatePillPage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <Link href="/create" className="text-sm text-[#6B5F58] hover:text-[#C45D3A] mb-6 inline-block">
          {t('backToCreate')}
        </Link>
        <h1 className="mb-8">{t('newPill')}</h1>
        <CreatePillForm />
      </main>
      <Footer />
    </>
  )
}
