import { ArrowUp } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { isSenderConfigured } from '@/lib/sender'
import { SubscribeForm } from '@/components/layout/SubscribeForm'
import { SubscribeModalButton } from '@/components/layout/SubscribeModalButton'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }
const light: React.CSSProperties = { ...aeonik, fontWeight: 300 }

/**
 * The newsletter banner above the footer: a black card with rounded corners and a thin lilac border that floats on the page, with
 * room below it so it does not melt into the black footer; a lilac eyebrow, a white title with one lime word and the sign-up on the
 * right (below the text on a phone). Once Sender's API token is set the sign-up is our own form; until then it is a button that opens
 * Sender's hosted form, so people can already subscribe. `flushTop` removes the gap above it, for pages that end in a full-width band.
 */
export async function NewsletterBanner({ flushTop = false }: { flushTop?: boolean } = {}) {
  const [t, tFooter] = await Promise.all([getTranslations('subscribe'), getTranslations('footer')])

  return (
    <section aria-labelledby="newsletter-title" className={`${flushTop ? '' : 'mt-20'} pb-12 sm:pb-16`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-[#A9A8E9] sm:rounded-3xl" style={{ background: '#000' }}>
          {/* decorative: the arrow of the logo */}
          <ArrowUp aria-hidden strokeWidth={1.5} className="pointer-events-none absolute -right-2 -top-4 size-[120px] text-[#A9A8E9] opacity-[0.14] sm:-top-5 sm:size-[190px]" />
          <div className="relative flex flex-col gap-8 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:gap-14 lg:py-12">
            <div className="min-w-0 flex-1">
              <p className="mb-3 text-xs uppercase tracking-[0.08em] text-[#A9A8E9]" style={light}>{t('eyebrow')}</p>
              <h2
                id="newsletter-title"
                className="text-white"
                style={{ ...aeonik, fontWeight: 500, fontSize: 'clamp(1.75rem, 3vw, 2.1rem)', lineHeight: 1.12, letterSpacing: '-0.02em' }}
              >
                {t.rich('bannerTitle', { hl: (chunks) => <span style={{ color: '#D2FE73' }}>{chunks}</span> })}
              </h2>
              <p className="mt-3 max-w-[520px] text-[15px] leading-relaxed text-[#A8A29E]" style={light}>{t('subtitle')}</p>
            </div>

            <div className="w-full lg:w-[360px] lg:shrink-0">
              {isSenderConfigured() ? (
                <SubscribeForm variant="banner" />
              ) : (
                <>
                  <SubscribeModalButton label={tFooter('subscribeCta')} closeLabel={tFooter('subscribeClose')} formTitle={tFooter('subscribeFormTitle')} className="" />
                  <p className="mt-3 text-xs leading-snug text-[#A8A29E]" style={light}>{t('privacy')}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
