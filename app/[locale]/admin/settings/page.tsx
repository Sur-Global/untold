import { createClient } from '@/lib/supabase/server'
import { getPlatformSettings } from '@/lib/data/platform-settings'
import {
  PlatformSettingsForm,
  type StaticPageSummary,
} from '@/components/admin/PlatformSettingsForm'

export default async function AdminPlatformSettingsPage() {
  const [settings, supabase] = await Promise.all([
    getPlatformSettings(),
    createClient(),
  ])

  const { data: pages } = await (supabase as any)
    .from('static_pages')
    .select(
      `
      id,
      slug,
      status,
      static_page_translations ( locale, title )
    `,
    )
    .order('updated_at', { ascending: false })

  const staticPages: StaticPageSummary[] = (pages ?? []).map((p: any) => {
    const enTitle = p.static_page_translations?.find((t: any) => t.locale === 'en')?.title
    return {
      id: p.id,
      slug: p.slug,
      status: p.status,
      title: (enTitle ?? p.slug).toUpperCase(),
    }
  })

  return <PlatformSettingsForm initial={settings} staticPages={staticPages} />
}
