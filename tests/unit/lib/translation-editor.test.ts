import { describe, it, expect } from 'vitest'
import { blocksPlainText, buildTranslationEditorData, statusOf, summaryColumn, translatableFields } from '@/lib/translation-editor'
import { newSlide } from '@/lib/pill-slides'

describe('which fields each kind of content translates', () => {
  it('a carousel pill has a description (excerpt) and slide texts; a text pill only its text', () => {
    expect(summaryColumn('pill', true)).toBe('excerpt')
    expect(summaryColumn('pill', false)).toBeNull()
    expect(translatableFields('pill', true, false)).toEqual({ summary: true, body: false, slides: true })
    expect(translatableFields('pill', false, false)).toEqual({ summary: false, body: true, slides: false })
  })
  it('a video has a short description and its text; a podcast and a course only the description', () => {
    expect(translatableFields('video', false, false)).toEqual({ summary: true, body: true, slides: false })
    expect(translatableFields('podcast', false, false)).toEqual({ summary: true, body: false, slides: false })
    expect(translatableFields('course', false, false)).toEqual({ summary: true, body: false, slides: false })
  })
  it('content available in one language only has no translated text, just the title and the short description', () => {
    expect(translatableFields('video', false, true)).toEqual({ summary: true, body: false, slides: false })
  })
})

describe('statusOf', () => {
  it('tells pending, automatic, corrected by hand and to review', () => {
    expect(statusOf(undefined)).toBe('pending')
    expect(statusOf({ locale: 'en', title: '' })).toBe('pending')
    expect(statusOf({ locale: 'en', title: 'Hi', is_auto_translated: true })).toBe('auto')
    expect(statusOf({ locale: 'en', title: 'Hi', is_auto_translated: null })).toBe('auto')
    expect(statusOf({ locale: 'en', title: 'Hi', is_auto_translated: false })).toBe('manual')
    expect(statusOf({ locale: 'en', title: 'Hi', is_auto_translated: false, needs_review: true })).toBe('review')
  })
})

describe('buildTranslationEditorData', () => {
  const slides = [{ ...newSlide('text'), id: 'a', text: 'Uno' }, { ...newSlide('photo'), id: 'b', text: '' }, { ...newSlide('text'), id: 'c', text: 'Tres' }]
  const data = buildTranslationEditorData({
    contentId: 'c1',
    type: 'pill',
    sourceLocale: 'es',
    singleLanguage: false,
    carousel: true,
    rows: [
      { locale: 'es', title: 'Título', excerpt: 'Descripción' },
      { locale: 'en', title: 'Title', excerpt: 'Description', is_auto_translated: false, needs_review: true },
      { locale: 'pt', title: 'Título pt', excerpt: 'Descrição', is_auto_translated: true },
    ],
    slides,
    slideTranslations: { en: [{ id: 'a', text: 'One' }] },
    enabledLocales: ['es', 'en', 'pt', 'fr'],
  })
  it('has the original, and a language for each active language but the original', () => {
    expect(data.source).toMatchObject({ title: 'Título', summary: 'Descripción' })
    expect(data.locales.map((l) => [l.locale, l.status])).toEqual([['en', 'review'], ['pt', 'auto'], ['fr', 'pending']])
  })
  it('lists the slides that have text, with their translation where there is one', () => {
    expect(data.source.slides).toEqual([{ id: 'a', text: 'Uno' }, { id: 'c', text: 'Tres' }])
    expect(data.locales[0].slides).toEqual([{ id: 'a', text: 'One' }, { id: 'c', text: '' }])
    expect(data.fields).toEqual({ summary: true, body: false, slides: true })
  })
})

describe('blocksPlainText', () => {
  it('reads the text of a rich text, a line per block, including children', () => {
    const body = [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hola ' }, { type: 'text', text: 'mundo' }] },
      { type: 'bulletListItem', content: [{ type: 'text', text: 'Uno' }], children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hijo' }] }] },
      { type: 'image' },
    ]
    expect(blocksPlainText(body)).toBe('Hola mundo\nUno\nHijo')
    expect(blocksPlainText(null)).toBe('')
  })
})
