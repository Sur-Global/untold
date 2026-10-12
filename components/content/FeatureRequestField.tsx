'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

/** "Submit for featured content" checkbox. Sends feature_requested=true|false with the form. */
export function FeatureRequestField({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const t = useTranslations('editor')
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div
      className="rounded-[16px] p-6 border-2"
      style={{ background: '#fff9f0', borderColor: '#b8860b', boxShadow: '0px 2px 8px 0px rgba(184,134,11,0.1)' }}
    >
      <input type="hidden" name="feature_requested" value={String(checked)} />
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 w-4 h-4 rounded accent-[#b8860b]"
        />
        <div>
          <p className="font-semibold text-[#5d4e37] mb-1">{t('featureRequestTitle')}</p>
          <p className="text-sm text-[#6b5744] leading-relaxed">{t('featureRequestDescription')}</p>
        </div>
      </label>
    </div>
  )
}
