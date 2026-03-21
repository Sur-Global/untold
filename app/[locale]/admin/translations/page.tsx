import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { TranslateButton } from '@/components/admin/TranslateButton'
import { SUPPORTED_LOCALES } from '@/lib/deepl'

export default async function TranslationsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const { data: items } = await (supabase as any)
    .from('content')
    .select(`
      id,
      type,
      published_at,
      content_translations (
        locale,
        is_auto_translated,
        title
      )
    `)
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-4">
      <h1 className="font-mono text-xl uppercase tracking-wide">Translations</h1>
      <p className="text-sm text-muted-foreground">
        Showing up to 50 most recently published items.{' '}
        <span className="text-green-600">✓ green</span> = auto-translated,{' '}
        <span className="text-blue-600">✓ blue</span> = manual,{' '}
        <span className="text-red-600">✗</span> = missing.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b text-left font-mono text-xs uppercase text-muted-foreground">
              <th className="py-2 pr-4">Title</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Published</th>
              <th className="py-2 pr-2">EN</th>
              {SUPPORTED_LOCALES.map((locale) => (
                <th key={locale} className="py-2 pr-2 uppercase">{locale}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item: any) => {
              const translations: Array<{ locale: string; is_auto_translated: boolean; title?: string }> =
                item.content_translations ?? []
              const translationMap = new Map(
                translations.map((t) => [t.locale, t.is_auto_translated])
              )
              const enRow = translations.find((t) => t.locale === 'en')

              return (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="py-2 pr-4 max-w-xs truncate font-medium">
                    {enRow?.title ?? item.id}
                  </td>
                  <td className="py-2 pr-4">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                      {item.type}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {item.published_at
                      ? new Date(item.published_at).toLocaleDateString()
                      : '—'}
                  </td>
                  <td className="py-2 pr-2">
                    <span className="text-green-600">✓</span>
                  </td>
                  {SUPPORTED_LOCALES.map((locale) => {
                    const isAutoTranslated = translationMap.get(locale)
                    const exists = translationMap.has(locale)
                    return (
                      <td key={locale} className="py-2 pr-2">
                        {exists ? (
                          <span className={isAutoTranslated === false ? 'text-blue-600' : 'text-green-600'}>
                            ✓
                          </span>
                        ) : (
                          <TranslateButton contentId={item.id} locale={locale} />
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
        {(!items || items.length === 0) && (
          <p className="py-8 text-center text-muted-foreground">No published content yet.</p>
        )}
      </div>
    </div>
  )
}
