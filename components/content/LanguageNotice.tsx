import { getLocale, getTranslations } from 'next-intl/server'
import { languageLabel } from '@/lib/language-availability'

/** "Only in Español" / "In Español · Subtitles: English" label on single-language content pages. */
export async function LanguageNotice({
  sourceLocale,
  subtitleLocales,
}: {
  sourceLocale: string
  subtitleLocales?: string[] | null
}) {
  const [t, locale] = await Promise.all([getTranslations('content'), getLocale()])
  return (
    <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-foreground">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <circle cx="8" cy="8" r="6.2" />
        <path d="M1.8 8h12.4M8 1.8c1.8 1.8 2.6 3.9 2.6 6.2S9.8 12.4 8 14.2C6.2 12.4 5.4 10.3 5.4 8S6.2 3.6 8 1.8z" />
      </svg>
      {languageLabel(t, locale, { sourceLocale, subtitleLocales })}
    </p>
  )
}
