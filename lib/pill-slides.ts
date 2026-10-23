// Carousel knowledge pills: a list of slides. A slide is a photo with text over it ('photo'), text on the brand's
// lilac ('text') or a finished image ('image'). The texts are real text (not part of the picture), so they
// can be translated; every slide shows the UNTOLD logo in the bottom right corner.

export const MAX_SLIDES = 20
export const SLIDE_TEXT_MAX = 600
export const SLIDE_CREDIT_MAX = 200
/** A text pill is very short: about 150 words */
export const PILL_TEXT_MAX_CHARS = 1000
/** The brand's lilac, the background of the text slides */
export const SLIDE_LILAC = '#A9A8E9'

export type SlideKind = 'photo' | 'text' | 'image'
/** What the person chose for the logo: automatic (white on dark pictures, black on light ones), a colour, or none */
export type SlideLogo = 'auto' | 'white' | 'black' | 'none'
export type LogoColor = 'white' | 'black'

export type PillSlide = {
  id: string
  kind: SlideKind
  image_url: string | null
  text: string
  credit: string
  logo: SlideLogo
  /** the colour chosen automatically when the pill was saved (looking at the picture's bottom right corner) */
  logo_color: LogoColor | null
}

const KINDS: SlideKind[] = ['photo', 'text', 'image']
const LOGOS: SlideLogo[] = ['auto', 'white', 'black', 'none']
const newId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `s-${Math.random().toString(36).slice(2, 10)}`)

/** A blank slide of a kind (what the editor adds) */
export function newSlide(kind: SlideKind): PillSlide {
  return { id: newId(), kind, image_url: null, text: '', credit: '', logo: kind === 'image' ? 'none' : kind === 'text' ? 'white' : 'auto', logo_color: null }
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
    const logo = kind === 'text' ? 'white' : LOGOS.includes(s.logo as SlideLogo) ? (s.logo as SlideLogo) : kind === 'image' ? 'none' : 'auto'
    slides.push({
      id: typeof s.id === 'string' && s.id.trim() ? s.id.trim().slice(0, 40) : newId(),
      kind,
      image_url: kind === 'text' ? null : url,
      text: typeof s.text === 'string' ? s.text.trim().slice(0, SLIDE_TEXT_MAX) : '',
      credit: typeof s.credit === 'string' ? s.credit.trim().slice(0, SLIDE_CREDIT_MAX) : '',
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

/** The colour of the logo on a slide, or null when it has none: always white on lilac */
export function logoColorOf(slide: PillSlide): LogoColor | null {
  if (slide.kind === 'text') return 'white'
  if (slide.logo === 'none') return null
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
