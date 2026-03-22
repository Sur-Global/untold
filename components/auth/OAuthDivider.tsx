'use client'
import { useTranslations } from 'next-intl'

export function OAuthDivider() {
  const t = useTranslations('auth')
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" style={{ borderColor: 'rgba(139,69,19,0.15)' }} />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground font-mono">
          {t('orDivider')}
        </span>
      </div>
    </div>
  )
}
