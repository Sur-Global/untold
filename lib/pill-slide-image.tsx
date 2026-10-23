import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { parse as parseFont, type Font } from 'opentype.js'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fetchImageFromUrl } from '@/lib/safe-fetch-image'
import { LILAC_TEXT_SHADOW_PX, logoColorOf, SLIDE_BRANDS, SLIDE_LILAC, SLIDE_LOGO_FILES, TEXT_SIZE_CQW, textBand, type LogoColor, type PillSlide, type SlideBrand } from '@/lib/pill-slides'
import {
  bandStyle, CQW_PX, fitSize, LILAC, LOGO_EDGE, LOGO_GAP, LOGO_WIDTH, parseSlideText, photoLineHeight, photoTextBox, SLIDE_HEIGHT_PX, SLIDE_WIDTH_PX,
} from '@/lib/slide-layout'

// The downloadable picture of a slide (1080 × 1350, the vertical format of Instagram), drawn with the same layout as the
// page: the photo (or the lilac) underneath, and the text, the band behind it and the logos on top.

type Fonts = { regular: { data: Buffer; font: Font }; medium: { data: Buffer; font: Font } }

let fonts: Promise<Fonts> | null = null
async function loadFonts(): Promise<Fonts> {
  fonts ??= (async () => {
    const load = async (file: string) => {
      const data = await readFile(join(process.cwd(), 'app', 'fonts', file))
      return { data, font: parseFont(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer) }
    }
    const [regular, medium] = await Promise.all([load('Aeonik-Regular.ttf'), load('Aeonik Pro Medium.ttf')])
    return { regular, medium }
  })()
  return fonts
}

/** How many lines a text takes when it is written in a width: words are not broken, only a word longer than the line is */
export function countLines(font: Font, text: string, size: number, width: number, letterSpacing = 0): number {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return 0
  const advance = (word: string) => font.getAdvanceWidth(word, size) + letterSpacing * word.length
  const space = advance(' ')
  let lines = 1
  let used = 0
  for (const word of words) {
    const length = advance(word)
    if (used === 0) used = length
    else if (used + space + length <= width) used += space + length
    else {
      lines += 1
      used = length
    }
    if (length > width) {
      lines += Math.floor(length / width)
      used = length % width
    }
  }
  return lines
}

const px = (cqw: number) => cqw * CQW_PX

/** The size (in cqw) the text over a photo is drawn at: the one chosen, or smaller when it does not fit */
export function photoTextSize(slide: PillSlide, logoCount: number, medium: Font): number {
  const base = TEXT_SIZE_CQW[slide.text_size]
  const box = photoTextBox(slide, logoCount)
  const width = SLIDE_WIDTH_PX - px(box.left + box.right)
  const available = SLIDE_HEIGHT_PX - px(box.top + box.bottom)
  const text = slide.text.replace(/\s+/g, ' ').trim()
  return fitSize(base, (size) => countLines(medium, text, px(size), width, -0.01 * px(size)) * px(size) * photoLineHeight(base), available)
}

/** The size (in cqw) the text of a lilac slide is drawn at */
export function lilacTextSize(text: string, regular: Font): number {
  const blocks = parseSlideText(text)
  const width = SLIDE_WIDTH_PX - px(LILAC.side * 2)
  const available = SLIDE_HEIGHT_PX - px(LILAC.top + LILAC.bottom)
  return fitSize(LILAC.size, (size) => {
    const lineHeight = px(size) * LILAC.lineHeight
    const heights = blocks.map((block) =>
      block.type === 'p'
        ? countLines(regular, block.text, px(size), width) * lineHeight
        : block.items.reduce((sum, item) => sum + countLines(regular, item, px(size), width - px(LILAC.listIndent)) * lineHeight, 0) + px(LILAC.itemGap) * (block.items.length - 1),
    )
    return heights.reduce((sum, h) => sum + h, 0) + px(LILAC.paragraphGap) * (blocks.length - 1)
  }, available)
}

const FLEX = { left: 'flex-start', top: 'flex-start', center: 'center', middle: 'center', right: 'flex-end', bottom: 'flex-end' } as const

type Logo = { brand: SlideBrand; src: string; width: number; height: number }
const logoCache = new Map<string, Logo>()
async function loadLogo(brand: SlideBrand, color: LogoColor): Promise<Logo> {
  const file = SLIDE_LOGO_FILES[brand][color]
  const cached = logoCache.get(file)
  if (cached) return cached
  const data = await readFile(join(process.cwd(), 'public', file))
  const meta = await sharp(data).metadata()
  const width = px(LOGO_WIDTH)
  const logo = { brand, src: `data:image/png;base64,${data.toString('base64')}`, width, height: (width * (meta.height ?? 1)) / (meta.width ?? 1) }
  logoCache.set(file, logo)
  return logo
}

async function logosOf(slide: PillSlide): Promise<Logo[]> {
  const color = logoColorOf(slide)
  if (!color) return []
  return Promise.all(SLIDE_BRANDS.filter((brand) => slide.brands.includes(brand)).map((brand) => loadLogo(brand, color)))
}

function Overlay({ slide, logos, textSize }: { slide: PillSlide; logos: Logo[]; textSize: number }) {
  const band = textBand(slide)
  const bandCss = band ? bandStyle(band) : null
  const box = photoTextBox(slide, logos.length)
  const size = px(textSize)
  return (
    <div style={{ width: SLIDE_WIDTH_PX, height: SLIDE_HEIGHT_PX, display: 'flex', position: 'relative', fontFamily: 'Aeonik' }}>
      {bandCss && (
        <div
          style={{
            // (a property that is undefined breaks the renderer, so only the ones the band has are given)
            position: 'absolute', left: 0, right: 0, height: bandCss.height,
            ...(bandCss.top !== undefined ? { top: bandCss.top } : {}), ...(bandCss.bottom !== undefined ? { bottom: bandCss.bottom } : {}),
            backgroundImage: bandCss.background as string,
          }}
        />
      )}

      {band && (
        <div
          style={{
            position: 'absolute', top: px(box.top), left: px(box.left), right: px(box.right), bottom: px(box.bottom),
            display: 'flex', flexDirection: 'column', justifyContent: FLEX[slide.text_y], alignItems: FLEX[slide.text_x],
          }}
        >
          <div
            style={{
              display: 'flex', maxWidth: '100%', textAlign: slide.text_x, color: slide.text_color === 'white' ? '#ffffff' : '#111111',
              fontSize: size, lineHeight: photoLineHeight(TEXT_SIZE_CQW[slide.text_size]), fontWeight: 500, letterSpacing: -0.01 * size,
            }}
          >
            {slide.text.replace(/\s+/g, ' ').trim()}
          </div>
        </div>
      )}

      {slide.kind === 'text' && (
        <div
          style={{
            position: 'absolute', top: px(LILAC.top), left: px(LILAC.side), right: px(LILAC.side), bottom: px(LILAC.bottom),
            display: 'flex', alignItems: 'center', color: '#ffffff', fontSize: size, lineHeight: LILAC.lineHeight, fontWeight: 400, textShadow: LILAC_TEXT_SHADOW_PX,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: px(LILAC.paragraphGap) }}>
            {parseSlideText(slide.text).map((block, i) =>
              block.type === 'p' ? (
                <div key={i} style={{ display: 'flex' }}>{block.text}</div>
              ) : (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: px(LILAC.itemGap) }}>
                  {block.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex' }}>
                      <div style={{ display: 'flex', width: px(LILAC.listIndent), justifyContent: 'flex-end', paddingRight: size * 0.35 }}>•</div>
                      <div style={{ display: 'flex', flex: 1 }}>{item}</div>
                    </div>
                  ))}
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {logos.length > 0 && (
        <div style={{ position: 'absolute', right: px(LOGO_EDGE), bottom: px(LOGO_EDGE), display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: px(LOGO_GAP) }}>
          {logos.map((logo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={logo.brand} src={logo.src} width={logo.width} height={logo.height} alt="" />
          ))}
        </div>
      )}
    </div>
  )
}

async function background(slide: PillSlide): Promise<Buffer> {
  const dark = () => sharp({ create: { width: SLIDE_WIDTH_PX, height: SLIDE_HEIGHT_PX, channels: 3, background: '#1a1a1a' } }).png().toBuffer()
  if (slide.kind === 'text') return sharp({ create: { width: SLIDE_WIDTH_PX, height: SLIDE_HEIGHT_PX, channels: 3, background: SLIDE_LILAC } }).png().toBuffer()
  if (!slide.image_url) return dark()
  try {
    // rotate() follows the picture's orientation, as the browser does
    return await sharp(await fetchImageFromUrl(slide.image_url)).rotate().resize(SLIDE_WIDTH_PX, SLIDE_HEIGHT_PX, { fit: 'cover' }).png().toBuffer()
  } catch {
    return dark()
  }
}

/** The picture (JPEG, 1080 × 1350) of one slide, as it shows on the page */
export async function renderSlideImage(slide: PillSlide): Promise<Buffer> {
  const { regular, medium } = await loadFonts()
  const logos = await logosOf(slide)
  const textSize = slide.kind === 'text' ? lilacTextSize(slide.text, regular.font) : textBand(slide) ? photoTextSize(slide, logos.length, medium.font) : 0
  const overlay = new ImageResponse(<Overlay slide={slide} logos={logos} textSize={textSize} />, {
    width: SLIDE_WIDTH_PX,
    height: SLIDE_HEIGHT_PX,
    fonts: [
      { name: 'Aeonik', data: regular.data.buffer.slice(regular.data.byteOffset, regular.data.byteOffset + regular.data.byteLength) as ArrayBuffer, weight: 400, style: 'normal' },
      { name: 'Aeonik', data: medium.data.buffer.slice(medium.data.byteOffset, medium.data.byteOffset + medium.data.byteLength) as ArrayBuffer, weight: 500, style: 'normal' },
    ],
  })
  const [base, top] = await Promise.all([background(slide), overlay.arrayBuffer()])
  return sharp(base).composite([{ input: Buffer.from(top) }]).jpeg({ quality: 90, chromaSubsampling: '4:4:4' }).toBuffer()
}
