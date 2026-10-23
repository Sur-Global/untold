import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'opentype.js'
import sharp from 'sharp'

vi.mock('next/og', () => ({
  // the real renderer is checked on the real pictures; here it returns a transparent 1080 × 1350 layer
  ImageResponse: class {
    arrayBuffer = async () => {
      const png = await sharp({ create: { width: 1080, height: 1350, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer()
      return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength)
    }
  },
}))
const photo = sharp({ create: { width: 300, height: 200, channels: 3, background: '#335577' } }).png().toBuffer()
vi.mock('@/lib/safe-fetch-image', () => ({ fetchImageFromUrl: async (url: string) => { if (url.includes('broken')) throw new Error('no'); return photo } }))

import { countLines, lilacTextSize, photoTextSize, renderSlideImage } from '@/lib/pill-slide-image'
import { newSlide, TEXT_SIZE_CQW, type PillSlide } from '@/lib/pill-slides'

const fontFile = (name: string) => { const b = readFileSync(join(process.cwd(), 'app', 'fonts', name)); return parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer) }
const regular = fontFile('Aeonik-Regular.ttf')
const medium = fontFile('Aeonik Pro Medium.ttf')

describe('countLines', () => {
  it('counts the lines a text takes in a width, without breaking words', () => {
    expect(countLines(regular, '', 40, 500)).toBe(0)
    expect(countLines(regular, 'Hola', 40, 500)).toBe(1)
    const text = 'Durante siglos hemos diseñado sin considerar nuestra interdependencia con la naturaleza'
    expect(countLines(regular, text, 40, 400)).toBeGreaterThan(countLines(regular, text, 40, 800))
    expect(countLines(regular, text, 20, 400)).toBeLessThan(countLines(regular, text, 40, 400))
  })
  it('breaks a word that is longer than the line', () => {
    expect(countLines(regular, 'Supercalifragilisticoespialidoso', 80, 300)).toBeGreaterThan(1)
  })
})

describe('the size of the text in the picture', () => {
  const photoSlide = (extra: Partial<PillSlide>): PillSlide => ({ ...newSlide('photo'), image_url: 'https://cdn/a.png', text: 'Del diseño sostenible al regenerativo', ...extra })

  it('is the size chosen when the text fits', () => {
    expect(photoTextSize(photoSlide({ text_size: 'm' }), 0, medium)).toBe(TEXT_SIZE_CQW.m)
  })
  it('shrinks a text that is too long for its size, as the page does', () => {
    const long = 'Un texto muy largo que no cabe en tamaño muy grande y que debe reducirse solo hasta que quepa dentro de la lámina. '.repeat(3)
    const size = photoTextSize(photoSlide({ text: long, text_size: 'xl' }), 0, medium)
    expect(size).toBeLessThan(TEXT_SIZE_CQW.xl)
    expect(size).toBeGreaterThanOrEqual(TEXT_SIZE_CQW.xl * 0.45)
  })
  it('lilac text keeps its size when short and shrinks when it is too long for the slide', () => {
    expect(lilacTextSize({ text: 'Comparte y súmate', text_size: 'm' }, regular)).toBe(5.2)
    expect(lilacTextSize({ text: 'Comparte y súmate', text_size: 'l' }, regular)).toBe(6.4)
    expect(lilacTextSize({ text: 'Una frase bastante larga para llenar la lámina. '.repeat(30), text_size: 'm' }, regular)).toBeLessThan(5.2)
  })
})

describe('renderSlideImage', () => {
  it('draws a 1080 × 1350 JPEG of a photo slide, and of a lilac one in the brand lilac', async () => {
    const slide = { ...newSlide('photo', ['untold']), image_url: 'https://cdn/a.png', text: 'Hola mundo' }
    const jpeg = await renderSlideImage(slide)
    expect(await sharp(jpeg).metadata()).toMatchObject({ format: 'jpeg', width: 1080, height: 1350 })
    const lilac = await renderSlideImage({ ...newSlide('text'), text: 'Texto' })
    const { data } = await sharp(lilac).raw().toBuffer({ resolveWithObject: true })
    // the brand lilac #A1A1E9 (161, 161, 233), give or take JPEG
    expect(Math.abs(data[0] - 161)).toBeLessThan(4)
    expect(Math.abs(data[1] - 161)).toBeLessThan(4)
    expect(Math.abs(data[2] - 233)).toBeLessThan(4)
  })
  it('draws a white text slide on white with black text, and the black logo', async () => {
    const jpeg = await renderSlideImage({ ...newSlide('text', ['untold']), text: 'Texto', text_bg: 'white' })
    const { data } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
    expect(data[0]).toBeGreaterThan(240)
    expect(data[1]).toBeGreaterThan(240)
    expect(data[2]).toBeGreaterThan(240)
  })
  it('uses a dark background when the picture cannot be read', async () => {
    const jpeg = await renderSlideImage({ ...newSlide('photo'), image_url: 'https://cdn/broken.png', text: 'Hola' })
    const { data } = await sharp(jpeg).raw().toBuffer({ resolveWithObject: true })
    expect(data[0]).toBeLessThan(40)
  })
})
