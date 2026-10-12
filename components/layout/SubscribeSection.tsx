import { getTranslations } from 'next-intl/server'
import { isSenderConfigured } from '@/lib/sender'
import { SubscribeForm } from '@/components/layout/SubscribeForm'
import { SubscribeEmbed } from '@/components/layout/SubscribeEmbed'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/**
 * Newsletter band at the bottom of the homepage. Uses our own form once Sender's API token
 * is configured; until then it falls back to Sender's hosted form so sign-ups keep working.
 */
export async function SubscribeSection() {
  const [t, tFooter] = await Promise.all([getTranslations('subscribe'), getTranslations('footer')])

  if (!isSenderConfigured()) {
    return (
      <section style={{ background: '#F1F1F1' }} aria-label={tFooter('subscribeFormTitle')}>
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SubscribeEmbed title={tFooter('subscribeFormTitle')} />
        </div>
      </section>
    )
  }

  return (
    <section style={{ background: '#000' }} aria-label={t('title')}>
      <div className="mx-auto max-w-7xl px-4 py-20 text-center sm:px-6">
        <p className="mb-3 text-xs uppercase tracking-[0.08em] text-[#A9A8E9]" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {t('eyebrow')}
        </p>
        <h2
          className="mx-auto mb-4 max-w-[640px] text-white"
          style={{ ...aeonik, fontWeight: 500, fontSize: 'clamp(1.9rem, 3.4vw, 2.8rem)', lineHeight: 1.1, letterSpacing: '-0.03em' }}
        >
          {t('title')}
        </h2>
        <p className="mx-auto mb-8 max-w-[480px] text-base" style={{ ...aeonik, color: '#A8A29E' }}>
          {t('subtitle')}
        </p>
        <SubscribeForm />
      </div>
    </section>
  )
}
