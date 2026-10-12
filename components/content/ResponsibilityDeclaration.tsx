'use client'

import { useTranslations } from 'next-intl'

/**
 * "I take responsibility for my content" — required before publishing any content type.
 * Short statement with the full text one click away. Sends responsibility_confirmed=true|false
 * with the form (and the server records when it was accepted).
 */
export function ResponsibilityDeclaration({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const t = useTranslations('editor')
  return (
    <div className="mt-6">
      <div
        className="rounded-[16px] p-6 border-2"
        style={{ background: '#fdf5f5', borderColor: '#8b4513', boxShadow: '0px 2px 8px 0px rgba(139,69,19,0.1)' }}
      >
        <input type="hidden" name="responsibility_confirmed" value={String(checked)} />
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-1 w-4 h-4 rounded accent-[#8b4513]"
          />
          <p className="text-sm font-medium text-[#4b3a2a] leading-relaxed">{t('responsibilityText')}</p>
        </label>
        <details className="mt-3 pl-7">
          <summary className="cursor-pointer text-sm text-[#8b4513] underline-offset-4 hover:underline">
            {t('responsibilityReadFull')}
          </summary>
          <p className="mt-2 text-sm text-[#6b5744] leading-relaxed">{t('publishConfirmationText')}</p>
        </details>
      </div>
      {!checked && <p className="mt-3 text-sm text-muted-foreground">{t('publishConfirmTooltip')}</p>}
    </div>
  )
}
