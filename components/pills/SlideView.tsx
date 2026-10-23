'use client'

import { useLayoutEffect, useRef } from 'react'
import { LILAC_TEXT_SHADOW, logoColorOf, SLIDE_BRANDS, SLIDE_LILAC, SLIDE_LOGO_FILES, TEXT_SIZE_CQW, textBand, type PillSlide } from '@/lib/pill-slides'
import { bandStyle, fitSize, LILAC, LOGO_EDGE, LOGO_GAP, LOGO_WIDTH, parseSlideText, photoLineHeight, photoTextBox } from '@/lib/slide-layout'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }
const FLEX = { left: 'flex-start', top: 'flex-start', center: 'center', middle: 'center', right: 'flex-end', bottom: 'flex-end' } as const

/** Text of a text slide: lines that start with "•", "-" or "*" become a list; the rest are paragraphs */
function SlideText({ text }: { text: string }) {
  return (
    <div style={{ display: 'grid', gap: `${LILAC.paragraphGap}cqw`, width: '100%' }}>
      {parseSlideText(text).map((b, i) =>
        b.type === 'p' ? (
          <p key={i} style={{ margin: 0, fontSize: 'inherit', lineHeight: 'inherit', color: 'inherit' }}>{b.text}</p>
        ) : (
          <ul key={i} style={{ margin: 0, paddingLeft: `${LILAC.listIndent}cqw`, display: 'grid', gap: `${LILAC.itemGap}cqw`, listStyle: 'disc' }}>
            {b.items.map((item, j) => <li key={j}>{item}</li>)}
          </ul>
        ),
      )}
    </div>
  )
}

/**
 * The text of a lilac slide, in the middle of its box. When it is too long for the slide it shrinks until it fits.
 */
function LilacText({ text }: { text: string }) {
  const box = useRef<HTMLDivElement>(null)
  const content = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const fit = () => {
      const area = box.current
      const inner = content.current
      if (!area || !inner) return
      area.style.fontSize = `${fitSize(LILAC.size, (size) => { area.style.fontSize = `${size}cqw`; return inner.offsetHeight }, area.clientHeight)}cqw`
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [text])

  return (
    <div
      ref={box}
      className="absolute flex items-center"
      style={{ top: `${LILAC.top}cqw`, left: `${LILAC.side}cqw`, right: `${LILAC.side}cqw`, bottom: `${LILAC.bottom}cqw`, color: '#fff', fontSize: `${LILAC.size}cqw`, lineHeight: LILAC.lineHeight, fontWeight: 400, textShadow: LILAC_TEXT_SHADOW }}
    >
      <div ref={content} style={{ width: '100%' }}>
        <SlideText text={text} />
      </div>
    </div>
  )
}

/**
 * The text over a photo: in the place, size and colour the slide says. It keeps out of the logos' way, and when it
 * does not fit its size it shrinks until it does (a translation can be longer).
 */
function PhotoText({ slide, logoCount }: { slide: PillSlide; logoCount: number }) {
  const box = useRef<HTMLDivElement>(null)
  const text = useRef<HTMLParagraphElement>(null)
  const base = TEXT_SIZE_CQW[slide.text_size]
  const { top, left, right, bottom } = photoTextBox(slide, logoCount)

  useLayoutEffect(() => {
    const fit = () => {
      const area = box.current
      const paragraph = text.current
      if (!area || !paragraph) return
      paragraph.style.fontSize = `${fitSize(base, (size) => { paragraph.style.fontSize = `${size}cqw`; return paragraph.offsetHeight }, area.clientHeight)}cqw`
    }
    fit()
    document.fonts?.ready.then(fit)
  }, [slide.text, base, slide.text_x, slide.text_y, logoCount, top, right, bottom])

  return (
    <div
      ref={box}
      className="absolute"
      style={{ top: `${top}cqw`, left: `${left}cqw`, right: `${right}cqw`, bottom: `${bottom}cqw`, display: 'flex', flexDirection: 'column', justifyContent: FLEX[slide.text_y], alignItems: FLEX[slide.text_x] }}
    >
      <p
        ref={text}
        style={{
          margin: 0, maxWidth: '100%', overflowWrap: 'break-word', textAlign: slide.text_x,
          color: slide.text_color === 'white' ? '#fff' : '#111', fontSize: `${base}cqw`, lineHeight: photoLineHeight(base), fontWeight: 500, letterSpacing: '-0.01em',
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

      {slide.kind === 'text' && <LilacText text={slide.text} />}

      {logo && (
        <div className="absolute flex flex-col items-end" style={{ right: `${LOGO_EDGE}cqw`, bottom: `${LOGO_EDGE}cqw`, gap: `${LOGO_GAP}cqw` }}>
          {SLIDE_BRANDS.filter((brand) => slide.brands.includes(brand)).map((brand) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={brand} src={SLIDE_LOGO_FILES[brand][logo]} alt="" aria-hidden style={{ width: `${LOGO_WIDTH}cqw`, height: 'auto' }} data-logo={logo} data-brand={brand} />
          ))}
        </div>
      )}
    </div>
  )
}
