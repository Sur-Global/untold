import { describe, it, expect } from 'vitest'
import { bandStyle, fitSize, LOGO_GAP, LOGO_HEIGHT, MIN_SCALE, parseSlideText, photoLineHeight, photoTextBox } from '@/lib/slide-layout'

describe('parseSlideText', () => {
  it('turns lines that start with a bullet or a dash into a list, and the rest into paragraphs', () => {
    expect(parseSlideText('Introducción\n- Uno\n• Dos\n* Tres\n\nFinal')).toEqual([
      { type: 'p', text: 'Introducción' },
      { type: 'ul', items: ['Uno', 'Dos', 'Tres'] },
      { type: 'p', text: 'Final' },
    ])
  })
})

describe('fitSize', () => {
  it('keeps the size when the text fits', () => {
    expect(fitSize(10, (size) => size * 10, 200)).toBe(10)
  })
  it('shrinks 6% at a time until the text fits', () => {
    const size = fitSize(10, (s) => s * 20, 150)
    expect(size).toBeLessThan(10)
    expect(size * 20).toBeLessThanOrEqual(151)
    expect(size / 0.94 * 20).toBeGreaterThan(151)
  })
  it('never goes below under half of the size', () => {
    expect(fitSize(10, () => 1000, 10)).toBeGreaterThanOrEqual(10 * MIN_SCALE)
  })
})

describe('photoTextBox', () => {
  const at = (text_x: any, text_y: any) => ({ text_x, text_y })
  it('keeps the margins when there are no logos', () => {
    expect(photoTextBox(at('right', 'bottom'), 0)).toEqual({ top: 6, left: 6, right: 6, bottom: 6 })
    expect(photoTextBox(at('center', 'middle'), 0)).toEqual({ top: 6, left: 6, right: 6, bottom: 6 })
  })
  it('stays above the logos, with more room for two logos than for one', () => {
    const one = photoTextBox(at('right', 'bottom'), 1).bottom
    const two = photoTextBox(at('right', 'bottom'), 2).bottom
    expect(one).toBeCloseTo(5 + LOGO_HEIGHT + 3, 5)
    expect(two).toBeCloseTo(5 + LOGO_HEIGHT * 2 + LOGO_GAP + 3, 5)
    expect(photoTextBox(at('center', 'top'), 1).bottom).toBeCloseTo(one, 5)
  })
  it('at the bottom left stays beside the logos instead', () => {
    expect(photoTextBox(at('left', 'bottom'), 2)).toMatchObject({ right: 32, bottom: 6 })
  })
  it('keeps a text in the middle in the middle: the same room above and below', () => {
    const box = photoTextBox(at('left', 'middle'), 1)
    expect(box.top).toBe(box.bottom)
  })
})

describe('photoLineHeight and bandStyle', () => {
  it('a bigger text has tighter lines', () => {
    expect(photoLineHeight(12.5)).toBeLessThan(photoLineHeight(6.4))
  })
  it('the band is dark under white text and light under black text, at the top, the middle or the bottom', () => {
    expect(bandStyle({ y: 'top', tone: 'dark' })).toMatchObject({ top: 0, height: '42%' })
    expect(bandStyle({ y: 'bottom', tone: 'dark' })).toMatchObject({ bottom: 0, height: '42%' })
    expect(bandStyle({ y: 'middle', tone: 'light' })).toMatchObject({ top: '22%', height: '56%' })
    expect(String(bandStyle({ y: 'top', tone: 'dark' }).background)).toContain('rgba(0,0,0,0.6)')
    expect(String(bandStyle({ y: 'top', tone: 'light' }).background)).toContain('rgba(255,255,255,0.7)')
  })
})
