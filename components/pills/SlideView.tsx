import { LILAC_TEXT_SHADOW, logoColorOf, SLIDE_BRANDS, SLIDE_LILAC, SLIDE_LOGO_FILES, type PillSlide } from '@/lib/pill-slides'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/** Text of a text slide: lines that start with "•", "-" or "*" become a list; the rest are paragraphs */
function SlideText({ text }: { text: string }) {
  const blocks: ({ type: 'p'; text: string } | { type: 'ul'; items: string[] })[] = []
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const bullet = /^[•\-*]\s+(.*)$/.exec(line)
    const last = blocks[blocks.length - 1]
    if (bullet) {
      if (last?.type === 'ul') last.items.push(bullet[1])
      else blocks.push({ type: 'ul', items: [bullet[1]] })
    } else blocks.push({ type: 'p', text: line })
  }
  return (
    <div style={{ display: 'grid', gap: '2.2cqw' }}>
      {blocks.map((b, i) =>
        b.type === 'p' ? (
          <p key={i} style={{ margin: 0 }}>{b.text}</p>
        ) : (
          <ul key={i} style={{ margin: 0, paddingLeft: '4.5cqw', display: 'grid', gap: '1.2cqw', listStyle: 'disc' }}>
            {b.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ),
      )}
    </div>
  )
}

/**
 * One slide of a carousel pill, always 4:5. Sizes follow the width of the slide (container units), so the same
 * slide looks right big, in a thumbnail in the editor or in a card. The logos (when an admin or editor chose them) sit in the bottom right corner.
 */
export function SlideView({ slide }: { slide: PillSlide }) {
  const logo = logoColorOf(slide)
  return (
    <div
      className="relative w-full overflow-hidden"
      style={{ aspectRatio: '4 / 5', containerType: 'inline-size', background: slide.kind === 'text' ? SLIDE_LILAC : '#1a1a1a', ...aeonik }}
      data-slide-kind={slide.kind}
    >
      {slide.kind !== 'text' && slide.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slide.image_url} alt={slide.kind === 'photo' ? slide.text : ''} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}

      {slide.kind === 'photo' && slide.text && (
        <>
          <div className="absolute inset-x-0 bottom-0" style={{ height: '42%', background: 'linear-gradient(to top, rgba(0,0,0,0.6), rgba(0,0,0,0))' }} aria-hidden />
          <p
            className="absolute"
            style={{ left: '6cqw', right: '32cqw', bottom: '6cqw', margin: 0, color: '#fff', fontSize: '6.4cqw', lineHeight: 1.2, fontWeight: 500, letterSpacing: '-0.01em' }}
          >
            {slide.text}
          </p>
        </>
      )}

      {slide.kind === 'text' && (
        <div className="absolute inset-0 flex items-center" style={{ padding: '9cqw 9cqw 20cqw', color: '#fff', fontSize: '5.2cqw', lineHeight: 1.45, fontWeight: 400, textShadow: LILAC_TEXT_SHADOW }}>
          <SlideText text={slide.text} />
        </div>
      )}

      {logo && (
        <div className="absolute flex flex-col items-end" style={{ right: '5cqw', bottom: '5cqw', gap: '1.6cqw' }}>
          {SLIDE_BRANDS.filter((brand) => slide.brands.includes(brand)).map((brand) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={brand} src={SLIDE_LOGO_FILES[brand][logo]} alt="" aria-hidden style={{ width: '24cqw', height: 'auto' }} data-logo={logo} data-brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}
