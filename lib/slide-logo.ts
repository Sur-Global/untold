import sharp from 'sharp'
import { fetchImageFromUrl } from '@/lib/safe-fetch-image'
import { textBand, type LogoColor, type PillSlide } from '@/lib/pill-slides'

/** Above this brightness (0 black … 1 white) of the logo's corner the logo is black; otherwise white */
export const LIGHT_BACKGROUND_THRESHOLD = 0.6
/** A dark band under white text at the bottom makes the corner look darker than the picture is; a light one under black text, lighter */
const TEXT_BAND_DARKENING = 0.72
const TEXT_BAND_LIGHTENING = 0.5

/**
 * White logo on dark pictures, black logo on light ones. `band` is the band under the text when it reaches the
 * bottom corner where the logo sits (only a text at the bottom does).
 */
export function logoColorForBrightness(brightness: number, band: 'dark' | 'light' | null = null): LogoColor {
  const seen = band === 'dark' ? brightness * TEXT_BAND_DARKENING : band === 'light' ? brightness + (1 - brightness) * TEXT_BAND_LIGHTENING : brightness
  return seen > LIGHT_BACKGROUND_THRESHOLD ? 'black' : 'white'
}

/** Brightness (0–1) of the bottom right corner of a picture, where the logo goes */
export async function cornerBrightness(image: Buffer): Promise<number> {
  const { width = 0, height = 0 } = await sharp(image).metadata()
  if (!width || !height) return 0
  const region = {
    left: Math.floor(width * 0.68),
    top: Math.floor(height * 0.88),
    width: Math.max(1, Math.floor(width * 0.3)),
    height: Math.max(1, Math.floor(height * 0.1)),
  }
  const { channels } = await sharp(image).extract(region).stats()
  const [r, g, b] = channels.slice(0, 3).map((c) => c.mean)
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
}

/** Chooses the logo colour of every slide with logos set to "automatic", looking at its picture. Anything that fails stays white. */
export async function resolveLogoColors(slides: PillSlide[]): Promise<PillSlide[]> {
  return Promise.all(
    slides.map(async (slide) => {
      if (slide.brands.length === 0) return { ...slide, logo_color: null }
      if (slide.kind === 'text' || slide.logo !== 'auto' || !slide.image_url) return { ...slide, logo_color: slide.logo === 'auto' ? 'white' : slide.logo_color }
      try {
        const brightness = await cornerBrightness(await fetchImageFromUrl(slide.image_url))
        const band = textBand(slide)
        return { ...slide, logo_color: logoColorForBrightness(brightness, band?.y === 'bottom' ? band.tone : null) }
      } catch {
        return { ...slide, logo_color: 'white' as const }
      }
    }),
  )
}
