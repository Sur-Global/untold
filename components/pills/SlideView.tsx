'use client'

import { useLayoutEffect, useRef } from 'react'
import { LILAC_TEXT_SHADOW, logoColorOf, SLIDE_BRANDS, SLIDE_LILAC, SLIDE_LOGO_FILES, TEXT_SIZE_CQW, textBand, type PillSlide } from '@/lib/pill-slides'

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
          <p key={i} style={{ margin: 0, fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}>{b.text}</p>
        ) : (
          <ul key={i} style={{ margin: 0, paddingLeft: '4.5cqw', display: 'grid', gap: '1.2cqw', listStyle: 'disc' }}>
            {b.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ),
      )}
    </div>
  )
}

const FLEX = { left: 'flex-start', top: 'flex-start', center: 'center', middle: 'center', right: 'flex-end', bottom: 'flex-end' } as const
const MARGIN = 6
// Height of one logo (the UNTOLD and SurGlobal pictures are 24cqw wide) and the gap between two
const LOGO_HEIGHT = 3.7
const LOGO_GAP = 1.6

/** The soft band behind a text over a photo: dark under white text, light under black text, following the text */
function bandStyle({ y, tone }: { y: 'top' | 'middle' | 'bottom'; tone: 'dark' | 'light' }): React.CSSProperties {
  const rgb = tone === 'dark' ? '0,0,0' : '255,255,255'
  const strong = tone === 'dark' ? 0.6 : 0.7
  const clear = `rgba(${rgb},0)`
  if (y === 'top') return { top: 0, height: '42%', background: `linear-gradient(to bottom, rgba(${rgb},${strong}), ${clear})` }
  if (y === 'bottom') return { bottom: 0, height: '42%', background: `linear-gradient(to top, rgba(${rgb},${strong}), ${clear})` }
  const mid = `rgba(${rgb},${strong * 0.75})`
  return { top: '22%', height: '56%', background: `linear-gradient(to bottom, ${clear}, ${mid} 30%, ${mid} 70%, ${clear})` }
}

/**
 * The text over a photo: in the place, size and colour the slide says. Where the logos are (bottom right) the text keeps
 * out of their way, and when it does not fit its size it shrinks until it does (a translation can be longer).
 */
function PhotoText({ slide, logoCount }: { slide: PillSlide; logoCount: number }) {
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLParagraphElement>(null)
  const base = TEXT_SIZE_CQW[slide.text_size]

  let right = MARGIN
  let bottom = MARGIN
  if (logoCount > 0 && slide.text_y === 'bottom') {
    if (slide.text_x === 'left') right = 32
    else bottom = 5 + LOGO_HEIGHT * logoCount + LOGO_GAP * (logoCount - 1) + 3
  }

  useLayoutEffect(() => {
    const fit = () => {
      const area = box.current
      const paragraph = text.current
      if (!area || !paragraph) return
      let size = base
      paragraph.style.fontSize = `${size}cqw`
      // 6% smaller each time, down to under half of the chosen size
      while (paragraph.offsetHeight > area.clientHeight + 1 && size * 0.94 >= base * 0.45) {
        size *= 0.94
        paragraph.style.fontSize = `${size}cqw`
      }
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [slide.text, base, slide.text_x, slide.text_y, logoCount, right, bottom])

  return (
    <div
      ref={box}
      className="absolute"
      style={{ top: `${MARGIN}cqw`, left: `${MARGIN}cqw`, right: `${right}cqw`, bottom: `${bottom}cqw`, display: 'flex', flexDirection: 'column', justifyContent: FLEX[slide.text_y], alignItems: FLEX[slide.text_x] }}
    >
      <p
        ref={text}
        style={{
          margin: 0, maxWidth: '100%', overflowWrap: 'break-word', textAlign: slide.text_x,
          color: slide.text_color === 'white' ? '#fff' : '#111', fontSize: `${base}cqw`, lineHeight: base > 8 ? 1.1 : 1.2, fontWeight: 500, letterSpacing: '-0.01em',
        }}
      >
        {slide.text}
      </p>
    </div>
  )
}

/**
 * One slide of a carousel pill, always 4:5. Sizes follow the width of the slide (container units), so the same
 * slide looks right big, in a thumbnail in the editor or in a card. The logos (when an admin or editor chose them) sit in the bottom right corner.
 */
export function SlideView({ slide }: { slide: PillSlide }) {
  const logo = logoColorOf(slide)
  const band = textBand(slide)
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

      {band && <div className="absolute inset-x-0" style={bandStyle(band)} aria-hidden />}
      {band && <PhotoText slide={slide} logoCount={logo ? slide.brands.length : 0} />}

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
