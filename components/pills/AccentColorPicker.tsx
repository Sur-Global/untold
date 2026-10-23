'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { normalizeAccent, PILL_ACCENTS } from '@/lib/pill-accent'

/** The accent colour of a pill: one of the SurGlobal brand colours. Submits as the `accent_color` field of the form. */
export function AccentColorPicker({ defaultValue }: { defaultValue?: string | null }) {
  const t = useTranslations('editor')
  const [value, setValue] = useState(normalizeAccent(defaultValue))
  const chosen = PILL_ACCENTS.find((accent) => accent.value === value)

  return (
    <div className="space-y-2">
      <Label>{t('accentColorLabel')}</Label>
      <input type="hidden" name="accent_color" value={value} />
      <div role="radiogroup" aria-label={t('accentColorLabel')} className="flex flex-wrap items-center gap-3">
        {PILL_ACCENTS.map((accent) => {
          const name = t(`accent.${accent.key}`)
          const selected = accent.value === value
          return (
            <button
              key={accent.value}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={name}
              title={name}
              onClick={() => setValue(accent.value)}
              className="h-10 w-10 rounded-full transition-shadow"
              style={{
                background: accent.value,
                border: '1px solid rgba(0,0,0,0.25)',
                boxShadow: selected ? '0 0 0 2px #fff, 0 0 0 4px #000' : 'none',
              }}
              data-accent={accent.value}
            />
          )
        })}
      </div>
      <p className="text-sm text-[#6B5F58]">{chosen ? t('accentColorChosen', { name: t(`accent.${chosen.key}`) }) : t('pickAccentColorHint')}</p>
    </div>
  )
}
