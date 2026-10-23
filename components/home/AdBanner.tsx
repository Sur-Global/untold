import { Link } from '@/i18n/navigation'
import { isExternalLink, type BannerSlot, type HomeBanner } from '@/lib/home-banners'

const aeonik = (weight: 300 | 400 | 500): React.CSSProperties => ({
  fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
  fontWeight: weight,
})

export type AdBannerCopy = {
  /** “Advertisement” */
  adLabel: string
  /** UNTOLD's own promo shown while no picture is uploaded */
  eyebrow: string
  title: string
  text: string
  cta: string
}

interface Props {
  banner: HomeBanner
  slot: BannerSlot
  copy: AdBannerCopy
  /** where UNTOLD's own promo points when no link was set */
  houseLink: string
}

const HOUSE_BACKGROUND: Record<BannerSlot, string> = { top: '#D2FE73', bottom: '#A9A8E9' }

/**
 * A wide banner on the homepage. With a picture uploaded in Admin → Advertising it shows the picture
 * (and a phone version, if given); without one it shows UNTOLD's own promo.
 */
export function AdBanner({ banner, slot, copy, houseLink }: Props) {
  if (!banner.enabled) return null

  const hasImage = !!banner.imageUrl
  const href = banner.linkUrl || (hasImage ? '' : houseLink)

  const label = banner.showLabel ? (
    <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-[#78716C]" style={aeonik(300)}>
      {copy.adLabel}
      {banner.sponsor ? ` · ${banner.sponsor}` : ''}
    </p>
  ) : null

  const body = hasImage ? (
    <picture>
      {banner.mobileImageUrl && <source media="(max-width: 639px)" srcSet={banner.mobileImageUrl} />}
      <img src={banner.imageUrl} alt={banner.altText} className="block h-auto w-full rounded-2xl" loading="lazy" />
    </picture>
  ) : (
    <div
      className="flex flex-col gap-6 rounded-2xl px-6 py-8 sm:px-10 md:flex-row md:items-center md:justify-between md:gap-10"
      style={{ background: HOUSE_BACKGROUND[slot], color: '#000' }}
    >
      <div className="max-w-2xl">
        <p className="mb-2 text-xs uppercase tracking-[0.08em]" style={aeonik(300)}>
          {copy.eyebrow}
        </p>
        <p
          className="mb-2"
          style={{ ...aeonik(500), fontSize: 'clamp(1.4rem, 2.4vw, 2rem)', lineHeight: 1.15, letterSpacing: '-0.02em' }}
        >
          {copy.title}
        </p>
        <p className="text-base" style={aeonik(300)}>
          {copy.text}
        </p>
      </div>
      <span
        className="inline-flex h-11 shrink-0 items-center self-start rounded-full bg-black px-6 text-sm text-white md:self-auto"
        style={aeonik(400)}
      >
        {copy.cta} ↗
      </span>
    </div>
  )

  const wrapped = !href ? (
    body
  ) : isExternalLink(href) ? (
    <a href={href} target="_blank" rel="sponsored noopener noreferrer" className="block">
      {body}
    </a>
  ) : href.startsWith('mailto:') ? (
    <a href={href} className="block">
      {body}
    </a>
  ) : (
    <Link href={href} className="block">
      {body}
    </Link>
  )

  return (
    <aside aria-label={banner.showLabel ? copy.adLabel : undefined} data-banner={slot}>
      {label}
      {wrapped}
    </aside>
  )
}
