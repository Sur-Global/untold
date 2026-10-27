'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { PODCAST_ORIGINS, PODCAST_ORIGIN_KEYS, type PodcastOrigin } from '@/lib/podcast-origin'

/**
 * The type of podcast (made by SurGlobal / UNTOLD.ink, in collaboration, interviewing them, or a third party's).
 * Only admins and editors get it, and one must be chosen to publish: `onChange` lets the form wait for it.
 * Sends `origin` with the form.
 */
export function PodcastOriginField({ defaultValue = null, onChange }: { defaultValue?: PodcastOrigin | null; onChange?: (origin: PodcastOrigin) => void }) {
  const t = useTranslations('editor')
  const tl = useTranslations('listings')
  const [value, setValue] = useState<PodcastOrigin | null>(defaultValue)

  return (
    <fieldset className="rounded-[16px] p-6 border-2" style={{ background: '#fdfcfa', borderColor: '#d4a574' }}>
      <legend className="px-2 font-semibold text-[#5d4e37]">{t('podcastOriginLegend')} *</legend>
      <p className="text-sm text-[#6b5744] leading-relaxed mb-4">{t('podcastOriginHint')}</p>
      <div className="space-y-3">
        {PODCAST_ORIGINS.map((origin) => (
          <label key={origin} className="flex items-start gap-3 cursor-pointer">
            <input
              type="radio"
              name="origin"
              value={origin}
              checked={value === origin}
              onChange={() => { setValue(origin); onChange?.(origin) }}
              className="mt-1 w-4 h-4 accent-[#b8860b]"
            />
            <span className="text-[#5d4e37]">{tl(PODCAST_ORIGIN_KEYS[origin])}</span>
          </label>
        ))}
      </div>
      {!value && <p className="mt-4 text-sm text-[#7c2d12]" role="status">{t('podcastOriginRequired')}</p>}
    </fieldset>
  )
}
