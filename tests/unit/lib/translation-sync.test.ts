import { describe, it, expect, vi } from 'vitest'
import { markTranslationsStale, saveSourceText } from '@/lib/translation-sync'

/** A fake of the database client that remembers every operation on content_translations */
function fakeDb(current: Record<string, unknown> | null = null) {
  const calls: { op: string; args: unknown[]; filters: unknown[][] }[] = []
  const builder = (op: string, args: unknown[]) => {
    const record = { op, args, filters: [] as unknown[][] }
    calls.push(record)
    const chain: any = new Proxy({}, {
      get: (_t, prop: string) => {
        if (prop === 'then') return (resolve: (v: unknown) => void) => resolve({ data: null, error: null })
        if (prop === 'maybeSingle') return async () => ({ data: current })
        return (...a: unknown[]) => { record.filters.push([prop, ...a]); return chain }
      },
    })
    return chain
  }
  const supabase = { from: () => ({ select: (...a: unknown[]) => builder('select', a), update: (...a: unknown[]) => builder('update', a), delete: (...a: unknown[]) => builder('delete', a), upsert: (...a: unknown[]) => builder('upsert', a) }) }
  return { supabase, calls }
}

describe('markTranslationsStale', () => {
  it('deletes the automatic translations when the title changed (a title cannot be empty), and flags the corrected ones', async () => {
    const { supabase, calls } = fakeDb()
    await markTranslationsStale(supabase, 'c1', 'es', { title: true })
    expect(calls.map((c) => c.op)).toEqual(['delete', 'update'])
    expect(calls[0].filters).toContainEqual(['neq', 'locale', 'es'])
    expect(calls[0].filters).toContainEqual(['or', 'is_auto_translated.is.null,is_auto_translated.eq.true'])
    expect(calls[1].args[0]).toEqual({ needs_review: true })
    expect(calls[1].filters).toContainEqual(['eq', 'is_auto_translated', false])
  })
  it('empties only the fields that changed in the automatic translations when the title did not', async () => {
    const { supabase, calls } = fakeDb()
    await markTranslationsStale(supabase, 'c1', 'es', { body: true, excerpt: true })
    expect(calls[0].op).toBe('update')
    expect(calls[0].args[0]).toEqual({ excerpt: null, body: null })
    expect(calls[1].args[0]).toEqual({ needs_review: true })
  })
  it('does nothing when nothing changed', async () => {
    const { supabase, calls } = fakeDb()
    await markTranslationsStale(supabase, 'c1', 'es', {})
    expect(calls).toHaveLength(0)
  })
  it('flagging only (changed slides) leaves the automatic translations as they are', async () => {
    const { supabase, calls } = fakeDb()
    await markTranslationsStale(supabase, 'c1', 'es', { slides: true })
    expect(calls.map((c) => c.op)).toEqual(['update'])
    expect(calls[0].args[0]).toEqual({ needs_review: true })
  })
})

describe('saveSourceText', () => {
  it('saves the original and tells what changed', async () => {
    const { supabase, calls } = fakeDb({ title: 'Viejo', description: 'Igual', body: null })
    const changed = await saveSourceText(supabase, 'c1', 'es', { title: 'Nuevo', description: 'Igual', body: null })
    expect(changed).toEqual({ title: true })
    const upsert = calls.find((c) => c.op === 'upsert')!
    expect(upsert.args[0]).toEqual({ content_id: 'c1', locale: 'es', title: 'Nuevo', description: 'Igual', body: null })
  })
  it('does not count a column this kind of content does not edit', async () => {
    const { supabase } = fakeDb({ title: 'T', description: 'Algo', body: [] })
    expect(await saveSourceText(supabase, 'c1', 'es', { title: 'T', body: [] })).toEqual({})
  })
})
