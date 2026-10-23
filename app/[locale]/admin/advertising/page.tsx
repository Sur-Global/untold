import { getTranslations } from 'next-intl/server'
import { requireAdmin } from '@/lib/require-admin'
import { getHomeBanners } from '@/lib/data/home-banners'
import { BannersForm } from '@/components/admin/BannersForm'

export default async function AdminAdvertisingPage({ params }: { params: Promise<{ locale: string }> }) {
  await requireAdmin()
  const { locale } = await params
  const [banners, t] = await Promise.all([getHomeBanners(), getTranslations({ locale, namespace: 'banners' })])
  const copy = (slot: 'top' | 'bottom') => ({
    adLabel: t('adLabel'),
    eyebrow: t(`${slot}.eyebrow`),
    title: t(`${slot}.title`),
    text: t(`${slot}.text`),
    cta: t(`${slot}.cta`),
  })
  return (
    <BannersForm
      initial={banners}
      copy={{ top: copy('top'), bottom: copy('bottom') }}
      houseLinks={{ top: '/create', bottom: 'https://surglobal.io' }}
    />
  )
}
