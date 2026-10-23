import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
const requestTranslation = vi.fn()
vi.mock('@/lib/translate-call', () => ({ requestTranslation: (...a: unknown[]) => requestTranslation(...a) }))
vi.mock('@/lib/require-creator', () => ({ requireCreator: vi.fn() }))

let user = { id: 'u1' }
let profile: any = { role: 'author' }
let content: any = null
let meta: any = null
let currentTranslation: any = null
const writes: { table: string; op: string; args: unknown[]; filters: unknown[][] }[] = []

function client() {
  return {
    from: (table: string) => {
      const query = (op: string, args: unknown[] = []) => {
        const record = { table, op, args, filters: [] as unknown[][] }
        if (op !== 'select') writes.push(record)
        const chain: any = new Proxy({}, {
          get: (_t, prop: string) => {
            if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
            if (prop === 'maybeSingle') {
              return async () => ({ data: table === 'content' ? content : table === 'pill_meta' ? meta : currentTranslation })
            }
            return (...a: unknown[]) => { record.filters.push([prop, ...a]); return chain }
          },
        })
        return chain
      }
      return { select: (...a: unknown[]) => query('select', a), update: (...a: unknown[]) => query('update', a), upsert: (...a: unknown[]) => query('upsert', a), delete: () => query('delete') }
    },
  }
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => client() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => client() }))

import { requireCreator } from '@/lib/require-creator'
import { markTranslationReviewed, saveTranslation, translateAgain } from '@/lib/actions/translations'

const carouselMeta = { format: 'carousel', slides: [{ id: 's1', kind: 'text', text: 'Uno' }, { id: 's2', kind: 'text', text: 'Dos' }], slide_translations: { pt: [{ id: 's1', text: 'Um' }] } }

describe('translation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    writes.length = 0
    user = { id: 'u1' }
    profile = { role: 'author' }
    content = { id: 'c1', type: 'pill', author_id: 'u1', source_locale: 'es', single_language: false }
    meta = carouselMeta
    currentTranslation = null
    vi.mocked(requireCreator).mockImplementation(async () => ({ user, profile }) as any)
  })

  describe('saveTranslation', () => {
    it('saves the title and description of a carousel as a manual translation, no longer needing review, and the slide texts', async () => {
      await saveTranslation('c1', 'en', { title: '  The title ', summary: 'A description', slides: [{ id: 's1', text: 'One' }, { id: 's2', text: ' Two ' }, { id: 'zzz', text: 'unknown' }] })
      const row = writes.find((w) => w.table === 'content_translations' && w.op === 'upsert')!
      expect(row.args[0]).toMatchObject({ content_id: 'c1', locale: 'en', title: 'The title', excerpt: 'A description', is_auto_translated: false, needs_review: false })
      const slides = writes.find((w) => w.table === 'pill_meta')!
      expect(slides.args[0]).toEqual({ slide_translations: { pt: [{ id: 's1', text: 'Um' }], en: [{ id: 's1', text: 'One' }, { id: 's2', text: 'Two' }] } })
    })
    it('a video saves its description in the description column and its text, and a podcast only the description', async () => {
      content = { id: 'c1', type: 'video', author_id: 'u1', source_locale: 'es', single_language: false }
      meta = null
      await saveTranslation('c1', 'en', { title: 'T', summary: 'D', body: [{ type: 'paragraph' }] })
      expect(writes.find((w) => w.op === 'upsert')!.args[0]).toMatchObject({ description: 'D', body: [{ type: 'paragraph' }] })
      writes.length = 0
      content = { id: 'c1', type: 'podcast', author_id: 'u1', source_locale: 'es', single_language: false }
      await saveTranslation('c1', 'en', { title: 'T', summary: 'D', body: [{ type: 'paragraph' }] })
      const podcast = writes.find((w) => w.op === 'upsert')!.args[0] as Record<string, unknown>
      expect(podcast).toMatchObject({ description: 'D' })
      expect(podcast).not.toHaveProperty('body')
    })
    it('a video available in one language only does not save a translated text', async () => {
      content = { id: 'c1', type: 'video', author_id: 'u1', source_locale: 'es', single_language: true }
      meta = null
      await saveTranslation('c1', 'en', { title: 'T', summary: 'D', body: [{ type: 'paragraph' }] })
      expect(writes.find((w) => w.op === 'upsert')!.args[0]).not.toHaveProperty('body')
    })
    it('needs a title, a language that is not the original and a supported one', async () => {
      await expect(saveTranslation('c1', 'en', { title: '   ' })).rejects.toThrow(/needs a title/)
      await expect(saveTranslation('c1', 'es', { title: 'x' })).rejects.toThrow(/original language/)
      await expect(saveTranslation('c1', 'xx', { title: 'x' })).rejects.toThrow(/Unsupported/)
    })
    it('only the author, an admin or an editor can translate it', async () => {
      user = { id: 'someone-else' }
      await expect(saveTranslation('c1', 'en', { title: 'x' })).rejects.toThrow(/your own content/)
      profile = { role: 'editor' }
      await expect(saveTranslation('c1', 'en', { title: 'x' })).resolves.toBeUndefined()
    })
    it('refuses content that is not a pill, video, podcast or course, or that does not exist', async () => {
      content = { id: 'c1', type: 'article', author_id: 'u1', source_locale: 'es' }
      await expect(saveTranslation('c1', 'en', { title: 'x' })).rejects.toThrow(/not found/)
      content = null
      await expect(saveTranslation('c1', 'en', { title: 'x' })).rejects.toThrow(/not found/)
    })
  })

  describe('markTranslationReviewed', () => {
    it('only clears the review flag', async () => {
      await markTranslationReviewed('c1', 'en')
      const update = writes.find((w) => w.op === 'update')!
      expect(update.args[0]).toEqual({ needs_review: false })
      expect(update.filters).toContainEqual(['eq', 'locale', 'en'])
    })
  })

  describe('translateAgain', () => {
    it('deletes the translation of that language (and its slide texts) and asks the translator to make it again', async () => {
      await translateAgain('c1', 'pt')
      const deleted = writes.find((w) => w.table === 'content_translations' && w.op === 'delete')!
      expect(deleted.filters).toContainEqual(['eq', 'locale', 'pt'])
      expect(writes.find((w) => w.table === 'pill_meta')!.args[0]).toEqual({ slide_translations: null })
      expect(requestTranslation).toHaveBeenCalledWith('c1', 'pt')
    })
    it('reports it when the translator fails', async () => {
      requestTranslation.mockRejectedValueOnce(new Error('DeepL translation quota exceeded'))
      await expect(translateAgain('c1', 'pt')).rejects.toThrow(/quota/)
    })
  })
})
