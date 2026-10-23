// Carousel knowledge pills: a list of slides. A slide is a photo with text over it ('photo'), text on the brand's
// lilac ('text') or a finished image ('image'). The texts are real text (not part of the picture), so they
// can be translated. Admins and editors can put the UNTOLD and / or SurGlobal logo in the bottom right corner of a slide.

export const MAX_SLIDES = 20
export const SLIDE_TEXT_MAX = 600
export const SLIDE_CREDIT_MAX = 200
/** The description under a carousel */
export const PILL_DESCRIPTION_MAX = 600
/** A text pill is very short: about 150 words */
export const PILL_TEXT_MAX_CHARS = 1000
/** The brand's lavender / lilac (SurGlobal brand manual), the background of the text slides */
export const SLIDE_LILAC = '#A1A1E9'

export type SlideKind = 'photo' | 'text' | 'image'
/** The colour the person chose for the logos: automatic (white on dark pictures, black on light ones), or one colour */
export type SlideLogo = 'auto' | 'white' | 'black'
export type LogoColor = 'white' | 'black'
/** The logos a slide can carry */
export type SlideBrand = 'untold' | 'surglobal'
/** Top to bottom, when a slide carries both (UNTOLD keeps the very corner) */
export const SLIDE_BRANDS: SlideBrand[] = ['surglobal', 'untold']
export const SLIDE_LOGO_FILES: Record<SlideBrand, Record<LogoColor, string>> = {
  untold: { white: '/logo-slide-white.png', black: '/logo-slide-black.png' },
  surglobal: { white: '/logo-slide-surglobal-white.png', black: '/logo-slide-surglobal-black.png' },
}
/** A light shadow under the white text on lilac, like the ones in the team's Figma designs (Y 2, blur 2, black 25% on a 1080 px slide) */
/** The same shadow in pixels, for the downloadable picture */
export const LILAC_TEXT_SHADOW_PX = '0 2px 2px rgba(0, 0, 0, 0.25)'
export const LILAC_TEXT_SHADOW = '0 max(1px, 0.19cqw) max(1px, 0.19cqw) rgba(0, 0, 0, 0.25)'

/** Where the text of a photo slide sits, how big it is and its colour */
export type TextX = 'left' | 'center' | 'right'
export type TextY = 'top' | 'middle' | 'bottom'
export type TextSize = 's' | 'm' | 'l' | 'xl'
export type TextColor = 'white' | 'black'
/** The background of a text slide: the brand's lilac (white text) or white (black text) */
export type TextBg = 'lilac' | 'white'
export const TEXT_XS: TextX[] = ['left', 'center', 'right']
export const TEXT_YS: TextY[] = ['top', 'middle', 'bottom']
export const TEXT_SIZES: TextSize[] = ['s', 'm', 'l', 'xl']
export const TEXT_COLORS: TextColor[] = ['white', 'black']
export const TEXT_BGS: TextBg[] = ['lilac', 'white']
export const TEXT_BG_COLOR: Record<TextBg, string> = { lilac: SLIDE_LILAC, white: '#F9F9F9' }
/** Font size of each size, in container-width units (cqw): 1cqw is 1% of the slide's width */
export const TEXT_SIZE_CQW: Record<TextSize, number> = { s: 4.6, m: 6.4, l: 9, xl: 12.5 }
/** How text over a photo looked before it could be moved: bottom left, medium, white */
export const TEXT_DEFAULTS = { text_x: 'left', text_y: 'bottom', text_size: 'm', text_color: 'white', text_bg: 'lilac' } as const satisfies Pick<PillSlide, 'text_x' | 'text_y' | 'text_size' | 'text_color' | 'text_bg'>

export type PillSlide = {
  id: string
  kind: SlideKind
  image_url: string | null
  text: string
  credit: string
  /** where the text over a photo sits, its size and colour */
  text_x: TextX
  text_y: TextY
  text_size: TextSize
  text_color: TextColor
  /** the background of a text slide (a text slide's text is white on lilac and black on white) */
  text_bg: TextBg
  /** the logos on the slide; none unless an admin or editor chose them */
  brands: SlideBrand[]
  logo: SlideLogo
  /** the colour chosen automatically when the pill was saved (looking at the picture's bottom right corner) */
  logo_color: LogoColor | null
}

const KINDS: SlideKind[] = ['photo', 'text', 'image']
const LOGOS: SlideLogo[] = ['auto', 'white', 'black']
const BRANDS: SlideBrand[] = ['untold', 'surglobal']
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `s-${Math.random().toString(36).slice(2, 10)}`)

/** A blank slide of a kind (what the editor adds), with the logos it starts with */
export function newSlide(kind: SlideKind, brands: SlideBrand[] = []): PillSlide {
  return { id: newId(), kind, image_url: null, text: '', credit: '', ...TEXT_DEFAULTS, brands, logo: kind === 'text' ? 'white' : 'auto', logo_color: null }
}

/** Cleans what comes from a form (or the database) into valid slides: unknown kinds are dropped, texts are limited */
export function parseSlides(raw: unknown): PillSlide[] {
  let list: unknown = raw
  if (typeof raw === 'string') {
    try {
      list = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(list)) return []
  const slides: PillSlide[] = []
  for (const item of list.slice(0, MAX_SLIDES)) {
    if (!item || typeof item !== 'object') continue
    const s = item as Record<string, unknown>
    if (!KINDS.includes(s.kind as SlideKind)) continue
    const kind = s.kind as SlideKind
    const url = typeof s.image_url === 'string' && /^https:\/\//.test(s.image_url.trim()) ? s.image_url.trim().slice(0, 1000) : null
    const logo = kind === 'text' ? 'white' : LOGOS.includes(s.logo as SlideLogo) ? (s.logo as SlideLogo) : 'auto'
    // Slides saved before the logos were a choice had one UNTOLD logo unless their logo was "none"
    const brands: SlideBrand[] = Array.isArray(s.brands)
      ? BRANDS.filter((b) => (s.brands as unknown[]).includes(b))
      : s.logo === undefined || s.logo === 'none' ? [] : ['untold']
    slides.push({
      id: typeof s.id === 'string' && s.id.trim() ? s.id.trim().slice(0, 40) : newId(),
      kind,
      image_url: kind === 'text' ? null : url,
      text: typeof s.text === 'string' ? s.text.trim().slice(0, SLIDE_TEXT_MAX) : '',
      credit: typeof s.credit === 'string' ? s.credit.trim().slice(0, SLIDE_CREDIT_MAX) : '',
      text_x: TEXT_XS.includes(s.text_x as TextX) ? (s.text_x as TextX) : TEXT_DEFAULTS.text_x,
      text_y: TEXT_YS.includes(s.text_y as TextY) ? (s.text_y as TextY) : TEXT_DEFAULTS.text_y,
      text_size: TEXT_SIZES.includes(s.text_size as TextSize) ? (s.text_size as TextSize) : TEXT_DEFAULTS.text_size,
      text_color: TEXT_COLORS.includes(s.text_color as TextColor) ? (s.text_color as TextColor) : TEXT_DEFAULTS.text_color,
      text_bg: TEXT_BGS.includes(s.text_bg as TextBg) ? (s.text_bg as TextBg) : TEXT_DEFAULTS.text_bg,
      brands,
      logo,
      logo_color: s.logo_color === 'white' || s.logo_color === 'black' ? s.logo_color : null,
    })
  }
  return slides
}

/** What is missing before a carousel can be published; null when it is fine */
export function slidesProblem(slides: PillSlide[]): string | null {
  if (slides.length < 2) return 'A carousel needs at least 2 slides'
  const empty = slides.findIndex((s) => (s.kind === 'text' ? !s.text : !s.image_url))
  if (empty >= 0) return `Slide ${empty + 1} is empty: ${slides[empty].kind === 'text' ? 'write its text' : 'add its picture'}`
  return null
}

/**
 * The soft band behind the text of a photo slide, so it can be read: dark under white text, light under black text,
 * at the top, the middle or the bottom of the slide, following the text. Null when there is no text.
 */
export function textBand(slide: PillSlide): { y: TextY; tone: 'dark' | 'light' } | null {
  if (slide.kind !== 'photo' || !slide.text) return null
  return { y: slide.text_y, tone: slide.text_color === 'white' ? 'dark' : 'light' }
}

/** The colour of the logos on a slide, or null when it has none: white on lilac, black on a white text slide */
export function logoColorOf(slide: PillSlide): LogoColor | null {
  if (slide.brands.length === 0) return null
  if (slide.kind === 'text') return slide.text_bg === 'white' ? 'black' : 'white'
  if (slide.logo === 'white' || slide.logo === 'black') return slide.logo
  return slide.logo_color ?? 'white'
}

/** The slides with their texts in the reader's language, where a translation exists (`translated` says if it does) */
export function localizedSlides(
  slides: PillSlide[],
  translations: Record<string, { id: string; text: string }[]> | null | undefined,
  locale: string,
  sourceLocale: string,
): { slides: PillSlide[]; translated: boolean } {
  if (locale === sourceLocale) return { slides, translated: true }
  const own = translations?.[locale]
  if (!Array.isArray(own)) return { slides, translated: false }
  const byId = new Map(own.map((t) => [t.id, t.text]))
  return {
    slides: slides.map((s) => (s.text && byId.has(s.id) ? { ...s, text: byId.get(s.id)! } : s)),
    translated: slides.filter((s) => s.text).every((s) => byId.has(s.id)),
  }
}

/** The cover of a carousel in listings: its first picture */
export function firstSlideImage(slides: PillSlide[]): string | null {
  return slides.find((s) => s.image_url)?.image_url ?? null
}

/** The credits of the pictures, in slide order, without repeats: "Slide 1: Name, source" */
export function slideCredits(slides: PillSlide[]): { number: number; credit: string }[] {
  const seen = new Set<string>()
  const out: { number: number; credit: string }[] = []
  slides.forEach((s, i) => {
    if (!s.credit || seen.has(s.credit)) return
    seen.add(s.credit)
    out.push({ number: i + 1, credit: s.credit })
  })
  return out
}

/** Characters of written text in a BlockNote body (to keep a text pill very short) */
export function blocksTextLength(body: unknown): number {
  let total = 0
  const walk = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(walk)
    else if (node && typeof node === 'object') {
      const n = node as Record<string, unknown>
      if (typeof n.text === 'string') total += n.text.length
      for (const value of Object.values(n)) if (value && typeof value === 'object') walk(value)
    }
  }
  walk(body)
  return total
}
