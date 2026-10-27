import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/deepl', () => ({ SUPPORTED_LOCALES: ['en', 'es', 'pt', 'fr', 'de', 'da'], translateTexts: vi.fn() }))

import { saveTopicDetails, setTagTopic } from '@/lib/actions/topics'
import { translateTexts } from '@/lib/deepl'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function db(error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ error })
  const update = vi.fn(() => ({ eq }))
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ update })) } as any)
  return { update, eq }
}

describe('setTagTopic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the user is an administrator, saves it and refreshes the site', async () => {
    const { update, eq } = db()
    expect(await setTagTopic('t1', true)).toEqual({ ok: true })
    expect(requireAdmin).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ is_topic: true })
    expect(eq).toHaveBeenCalledWith('id', 't1')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('can make a topic a plain tag again', async () => {
    const { update } = db()
    await setTagTopic('t1', false)
    expect(update).toHaveBeenCalledWith({ is_topic: false })
  })

  it('reports a database error instead of throwing', async () => {
    db({ message: 'permission denied' })
    expect(await setTagTopic('t1', true)).toEqual({ ok: false, error: 'permission denied' })
  })
})

describe('saveTopicDetails', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(translateTexts).mockImplementation(async (texts: string[], locale: string) => texts.map((t) => `[${locale}] ${t}`))
  })

  it('saves the Spanish sentence with its translations and the picture, checking the user is an administrator', async () => {
    const { update, eq } = db()
    expect(await saveTopicDetails('t1', { description: '  Otros mañanas.  ', imageUrl: 'https://cdn/x.webp' })).toEqual({ ok: true, translated: true })
    expect(requireAdmin).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({
      descriptions: { es: 'Otros mañanas.', en: '[en] Otros mañanas.', pt: '[pt] Otros mañanas.', fr: '[fr] Otros mañanas.', de: '[de] Otros mañanas.', da: '[da] Otros mañanas.' },
      image_url: 'https://cdn/x.webp',
    })
    expect(eq).toHaveBeenCalledWith('id', 't1')
    expect(vi.mocked(translateTexts).mock.calls.every(([, , source]) => source === 'es')).toBe(true)
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('keeps the Spanish sentence, and says it was not translated, when the translator fails', async () => {
    vi.mocked(translateTexts).mockRejectedValue(new Error('quota'))
    const { update } = db()
    expect(await saveTopicDetails('t1', { description: 'Hola', imageUrl: '' })).toEqual({ ok: true, translated: false })
    expect(update).toHaveBeenCalledWith({ descriptions: { es: 'Hola' }, image_url: null })
  })

  it('an empty sentence clears them all and a picture that is not a web address is dropped', async () => {
    const { update } = db()
    await saveTopicDetails('t1', { description: '   ', imageUrl: 'javascript:alert(1)' })
    expect(translateTexts).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ descriptions: {}, image_url: null })
  })

  it('cuts a sentence that is too long', async () => {
    const { update } = db()
    await saveTopicDetails('t1', { description: 'a'.repeat(500), imageUrl: '' })
    expect((update.mock.calls[0] as any)[0].descriptions.es).toHaveLength(240)
  })

  it('reports a database error instead of throwing', async () => {
    db({ message: 'permission denied' })
    expect(await saveTopicDetails('t1', { description: 'x', imageUrl: '' })).toEqual({ ok: false, error: 'permission denied' })
  })
})
