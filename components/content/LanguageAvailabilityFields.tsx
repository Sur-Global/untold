'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { AVAILABILITY_MARKER } from '@/lib/language-availability'

const LANGUAGES: Array<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'da', label: 'Dansk' },
]

interface Props {
  /** Videos can list the languages they have subtitles in */
  showSubtitles?: boolean
  defaultSingle?: boolean
  defaultSubtitles?: string[]
  /** The content's original language — never offered as a subtitle language */
  sourceLocale?: string
  /** For forms that build their FormData by hand (autosaving edit forms) */
  onChange?: (value: { single: boolean; subtitles: string[] }) => void
}

/**
 * "Only available in this language" checkbox for the create/edit panels (all content types),
 * plus subtitle languages for videos. Pairs with readLanguageAvailability on the server.
 */
export function LanguageAvailabilityFields({
  showSubtitles = false,
  defaultSingle = false,
  defaultSubtitles = [],
  sourceLocale,
  onChange,
}: Props) {
  const t = useTranslations('editor')
  const [single, setSingle] = useState(defaultSingle)
  const [subtitles, setSubtitles] = useState<string[]>(defaultSubtitles)

  const update = (nextSingle: boolean, nextSubtitles: string[]) => {
    setSingle(nextSingle)
    setSubtitles(nextSubtitles)
    onChange?.({ single: nextSingle, subtitles: nextSingle ? nextSubtitles : [] })
  }

  return (
    <div className="space-y-3 rounded-[10px] border border-primary/10 bg-muted/20 p-4">
      <input type="hidden" name={AVAILABILITY_MARKER} value="1" />
      <label className="flex items-start gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          name="single_language"
          checked={single}
          onChange={(e) => update(e.target.checked, subtitles)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          <span className="font-semibold">{t('singleLanguageLabel')}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{t('singleLanguageHint')}</span>
        </span>
      </label>

      {showSubtitles && single && (
        <fieldset className="pl-7">
          <legend className="mb-1.5 text-sm font-semibold text-foreground">{t('subtitlesLabel')}</legend>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {LANGUAGES.filter((l) => l.code !== sourceLocale).map((l) => (
              <label key={l.code} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  name="subtitle_locales"
                  value={l.code}
                  checked={subtitles.includes(l.code)}
                  onChange={(e) =>
                    update(single, e.target.checked ? [...subtitles, l.code] : subtitles.filter((c) => c !== l.code))
                  }
                  className="h-4 w-4"
                />
                {l.label}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}
