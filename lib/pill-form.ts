import { blocksTextLength, parseSlides, PILL_DESCRIPTION_MAX, PILL_TEXT_MAX_CHARS, slidesProblem, type PillSlide } from '@/lib/pill-slides'
import { resolveLogoColors } from '@/lib/slide-logo'

/**
 * What the pill form sent: a very short text pill, or a carousel of slides (with its description).
 * Only admins and editors choose the logos of the slides (`canBrand`); anyone else keeps the logos the slide already
 * had in `existing` (what is saved), and new slides get none, whatever the form says.
 */
export async function readPillFormat(formData: FormData, publishing: boolean, { canBrand, existing }: { canBrand: boolean; existing?: unknown }) {
  const format: 'text' | 'carousel' = formData.get('format') === 'carousel' ? 'carousel' : 'text'
  if (format === 'text') return { format, slides: [] as PillSlide[], description: null as string | null }
  let parsed = parseSlides(formData.get('slides') as string | null)
  if (!canBrand) {
    const saved = new Map(parseSlides(existing).map((slide) => [slide.id, slide]))
    parsed = parsed.map((slide) => ({ ...slide, brands: saved.get(slide.id)?.brands ?? [], logo: saved.get(slide.id)?.logo ?? 'auto' }))
  }
  if (publishing) {
    const problem = slidesProblem(parsed)
    if (problem) throw new Error(problem)
  }
  const slides = await resolveLogoColors(parsed)
  const description = (formData.get('description') as string | null)?.trim().slice(0, PILL_DESCRIPTION_MAX) || null
  return { format, slides, description }
}

/** A text pill is very short */
export function assertShortText(body: unknown) {
  if (blocksTextLength(body) > PILL_TEXT_MAX_CHARS) {
    throw new Error(`A knowledge pill is very short: up to ${PILL_TEXT_MAX_CHARS} characters (about 150 words). For a longer text, write an article.`)
  }
}

