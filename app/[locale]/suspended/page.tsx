import { getTranslations } from 'next-intl/server'

export default async function SuspendedPage() {
  const t = await getTranslations('suspended')
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-mono text-2xl uppercase tracking-wide">{t('title')}</h1>
        <p className="text-muted-foreground">{t('text')}</p>
        <a href="mailto:hello@untold.ink" className="text-sm underline">
          hello@untold.ink
        </a>
      </div>
    </div>
  )
}
