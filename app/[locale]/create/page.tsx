import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { CreateArticleForm } from './CreateArticleForm'

export default async function CreatePage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="mb-8">{t('titlePlaceholder')}</h1>
        <CreateArticleForm />
      </main>
      <Footer />
    </>
  )
}
