import { blocksTextLength, parseSlides, PILL_TEXT_MAX_CHARS, slidesProblem, type PillSlide } from '@/lib/pill-slides'
import { resolveLogoColors } from '@/lib/slide-logo'

/** What the pill form sent: a very short text pill, or a carousel of slides (with its description) */
export async function readPillFormat(formData: FormData, publishing: boolean) {
  const format: 'text' | 'carousel' = formData.get('format') === 'carousel' ? 'carousel' : 'text'
  if (format === 'text') return { format, slides: [] as PillSlide[], description: null as string | null }
  const parsed = parseSlides(formData.get('slides') as string | null)
  if (publishing) {
    const problem = slidesProblem(parsed)
    if (problem) throw new Error(problem)
  }
  const slides = await resolveLogoColors(parsed)
  const description = (formData.get('description') as string | null)?.trim().slice(0, 600) || null
  return { format, slides, description }
}

/** A text pill is very short */
export function assertShortText(body: unknown) {
  if (blocksTextLength(body) > PILL_TEXT_MAX_CHARS) {
    throw new Error(`A knowledge pill is very short: up to ${PILL_TEXT_MAX_CHARS} characters (about 150 words). For a longer text, write an article.`)
  }
}

