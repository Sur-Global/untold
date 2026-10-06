'use client'

import { useLocale, useTranslations } from 'next-intl'

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'da', label: 'Dansk' },
]

/**
 * The language the content is written in (the "original"). Other languages are
 * translated from it, so this must match what the author actually writes.
 * Defaults to the language the site is currently shown in.
 */
export function ContentLanguageSelect() {
  const t = useTranslations('editor')
  const locale = useLocale()

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-foreground">{t('contentLanguageLabel')}</label>
      <p className="text-xs text-muted-foreground -mt-1">{t('contentLanguageHint')}</p>
      <select
        name="source_locale"
        defaultValue={LANGUAGES.some((l) => l.code === locale) ? locale : 'en'}
        className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>{l.label}</option>
        ))}
      </select>
    </div>
  )
}
