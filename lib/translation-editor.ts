// What the translation editor (the "Traducciones" panel of the edit pages) needs, and the rules it follows.

import { SUPPORTED_LOCALES } from '@/lib/deepl'
import { parseSlides } from '@/lib/pill-slides'

export type TranslationStatus = 'auto' | 'manual' | 'review' | 'pending'

export type EditorBlockLike = Record<string, unknown>

export type TranslationLocale = {
  locale: string
  status: TranslationStatus
  title: string
  summary: string
  body: EditorBlockLike[] | null
  slides: { id: string; text: string }[]
}

export type TranslationEditorData = {
  contentId: string
  /** the text of the original, shown above each field */
  sourceLocale: string
  source: { title: string; summary: string; body: EditorBlockLike[] | null; slides: { id: string; text: string }[] }
  /** which fields this kind of content translates */
  fields: { summary: boolean; body: boolean; slides: boolean }
  /** a video, podcast or course available in one language only: just its title and a short description are translated */
  shortOnly: boolean
  locales: TranslationLocale[]
}

type Row = { locale: string; title?: string | null; excerpt?: string | null; description?: string | null; body?: unknown; is_auto_translated?: boolean | null; needs_review?: boolean | null }

/** The column a kind of content keeps its short description in, or null when it has none (a text pill) */
export function summaryColumn(type: string, carousel: boolean): 'excerpt' | 'description' | null {
  if (type === 'pill') return carousel ? 'excerpt' : null
  if (type === 'video' || type === 'podcast' || type === 'course') return 'description'
  return null
}

/** The fields each kind of content has in its translations */
export function translatableFields(type: string, carousel: boolean, singleLanguage: boolean) {
  const summary = summaryColumn(type, carousel) !== null
  const body = !singleLanguage && ((type === 'pill' && !carousel) || type === 'video')
  return { summary, body, slides: type === 'pill' && carousel }
}

export function statusOf(row: Row | undefined): TranslationStatus {
  if (!row || !row.title) return 'pending'
  if (row.is_auto_translated === false) return row.needs_review ? 'review' : 'manual'
  return 'auto'
}

const asBlocks = (value: unknown): EditorBlockLike[] | null => (Array.isArray(value) ? (value as EditorBlockLike[]) : null)

/** The panel's data from the rows of the database */
export function buildTranslationEditorData(input: {
  contentId: string
  type: string
  sourceLocale: string
  singleLanguage: boolean
  carousel: boolean
  rows: Row[]
  slides: unknown
  slideTranslations: Record<string, { id: string; text: string }[]> | null | undefined
  enabledLocales: string[]
}): TranslationEditorData {
  const { type, sourceLocale, rows } = input
  const column = summaryColumn(type, input.carousel)
  const fields = translatableFields(type, input.carousel, input.singleLanguage)
  const summaryOf = (row?: Row) => (column ? (row?.[column] ?? '') : '')
  const sourceRow = rows.find((row) => row.locale === sourceLocale)
  const sourceSlides = parseSlides(input.slides).filter((slide) => slide.text).map((slide) => ({ id: slide.id, text: slide.text }))

  return {
    contentId: input.contentId,
    sourceLocale,
    source: { title: sourceRow?.title ?? '', summary: summaryOf(sourceRow), body: asBlocks(sourceRow?.body), slides: sourceSlides },
    fields,
    shortOnly: input.singleLanguage,
    locales: (SUPPORTED_LOCALES as readonly string[])
      .filter((locale) => locale !== sourceLocale && input.enabledLocales.includes(locale))
      .map((locale) => {
        const row = rows.find((r) => r.locale === locale)
        const translatedSlides = new Map((input.slideTranslations?.[locale] ?? []).map((slide) => [slide.id, slide.text]))
        return {
          locale,
          status: statusOf(row),
          title: row?.title ?? '',
          summary: summaryOf(row),
          body: asBlocks(row?.body),
          slides: sourceSlides.map((slide) => ({ id: slide.id, text: translatedSlides.get(slide.id) ?? '' })),
        }
      }),
  }
}

/** The plain text of a rich text (BlockNote) body: a line per block */
export function blocksPlainText(body: unknown): string {
  const lines: string[] = []
  const inline = (node: unknown): string => {
    if (Array.isArray(node)) return node.map(inline).join('')
    if (node && typeof node === 'object') {
      const n = node as Record<string, unknown>
      if (typeof n.text === 'string') return n.text
      // a table keeps its text in rows of cells
      if (Array.isArray(n.rows)) {
        return n.rows
          .map((row) => {
            const cells = (row as Record<string, unknown>)?.cells
            return Array.isArray(cells) ? cells.map(inline).join(' ') : ''
          })
          .join(' ')
      }
      return inline(n.content)
    }
    return typeof node === 'string' ? node : ''
  }
  const walk = (blocks: unknown) => {
    if (!Array.isArray(blocks)) return
    for (const block of blocks) {
      if (!block || typeof block !== 'object') continue
      const b = block as Record<string, unknown>
      const text = inline(b.content).trim()
      if (text) lines.push(text)
      walk(b.children)
    }
  }
  walk(body)
  return lines.join('\n')
}
