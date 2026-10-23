// How a slide is laid out, in one place: the page shows it with these numbers (in cqw, 1% of the slide's width) and the
// downloadable picture is drawn with the same ones (1cqw = 10.8px on a 1080 px wide image).

import type { CSSProperties } from 'react'
import type { PillSlide, TextSize, TextY } from '@/lib/pill-slides'

export const SLIDE_WIDTH_PX = 1080
export const SLIDE_HEIGHT_PX = 1350
export const CQW_PX = SLIDE_WIDTH_PX / 100

export const MARGIN = 6
// Height of one logo (the UNTOLD and SurGlobal pictures are 24cqw wide) and the gap between two
export const LOGO_WIDTH = 24
export const LOGO_HEIGHT = 3.7
export const LOGO_GAP = 1.6
export const LOGO_EDGE = 5

/** A text that does not fit shrinks 6% at a time, down to under half of its size */
export const SHRINK_STEP = 0.94
export const MIN_SCALE = 0.45

/** The text of a text slide: its box (distance to the edges) and the spacing of its paragraphs and lists */
export const LILAC = { top: 9, side: 9, bottom: 20, paragraphGap: 2.2, listIndent: 4.5, itemGap: 1.2 }
/** The room a text slide's text has: all the slide inside the margins, and above the logos when there are any */
export const lilacBox = (logoCount: number) => ({ top: LILAC.top, side: LILAC.side, bottom: logoCount > 0 ? LILAC.bottom : LILAC.top })
/** Big text is set a little tighter, as in the team's designs */
export const lilacLetterSpacing = (base: number) => (base >= 6 ? -0.02 : 0)
/** The sizes of the text of a text slide, in cqw (medium is how every text slide was before it had sizes) */
export const LILAC_SIZE_CQW: Record<TextSize, number> = { s: 4.4, m: 5.2, l: 6.4, xl: 8 }
/** Big text is set tight, like the team's designs, with a blank line between paragraphs */
export const lilacLineHeight = (base: number) => (base >= 6 ? 1.15 : 1.45)
export const lilacParagraphGap = (base: number) => (base >= 6 ? base * 1.15 : LILAC.paragraphGap)

export type SlideTextBlock = { type: 'p'; text: string } | { type: 'ul'; items: string[] }

/** Text of a text slide: lines that start with "•", "-" or "*" become a list; the rest are paragraphs */
export function parseSlideText(text: string): SlideTextBlock[] {
  const blocks: SlideTextBlock[] = []
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
  return blocks
}

/** The biggest size, from `base` down, at which the text fits the room it has (`heightAt` says how tall it is at a size) */
export function fitSize(base: number, heightAt: (size: number) => number, available: number): number {
  let size = base
  while (heightAt(size) > available + 1 && size * SHRINK_STEP >= base * MIN_SCALE) size *= SHRINK_STEP
  return size
}

/**
 * Where the text over a photo may go: inside the slide's margins, above the logos (and, at the bottom left, beside them).
 * A text in the middle keeps in the middle: the same room above as below.
 */
export function photoTextBox(slide: Pick<PillSlide, 'text_x' | 'text_y'>, logoCount: number) {
  const clearance = logoCount > 0 ? LOGO_EDGE + LOGO_HEIGHT * logoCount + LOGO_GAP * (logoCount - 1) + 3 : MARGIN
  let top = MARGIN
  let right = MARGIN
  let bottom = MARGIN
  if (logoCount > 0) {
    if (slide.text_y === 'bottom' && slide.text_x === 'left') right = 32
    else bottom = clearance
    if (slide.text_y === 'middle') top = clearance
  }
  return { top, left: MARGIN, right, bottom }
}

/** The line height of a text over a photo: tighter when it is big */
export const photoLineHeight = (baseSize: number) => (baseSize > 8 ? 1.1 : 1.2)

/** The soft band behind the text over a photo: dark under white text, light under black text, following the text */
export function bandStyle({ y, tone }: { y: TextY; tone: 'dark' | 'light' }): CSSProperties {
  const rgb = tone === 'dark' ? '0,0,0' : '255,255,255'
  const strong = tone === 'dark' ? 0.6 : 0.7
  const clear = `rgba(${rgb},0)`
  if (y === 'top') return { top: 0, height: '42%', background: `linear-gradient(to bottom, rgba(${rgb},${strong}), ${clear})` }
  if (y === 'bottom') return { bottom: 0, height: '42%', background: `linear-gradient(to top, rgba(${rgb},${strong}), ${clear})` }
  const mid = `rgba(${rgb},${strong * 0.75})`
  return { top: '22%', height: '56%', background: `linear-gradient(to bottom, ${clear}, ${mid} 30%, ${mid} 70%, ${clear})` }
}
