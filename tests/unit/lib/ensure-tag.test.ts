import { describe, it, expect, vi, beforeEach } from 'vitest'

const after = vi.fn()
vi.mock('next/server', () => ({ after: (fn: () => unknown) => after(fn) }))
vi.mock('@/lib/require-creator', () => ({ requireCreator: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
const triggerTagTranslations = vi.fn()
vi.mock('@/lib/trigger-tag-translations', () => ({ triggerTagTranslations: (l: string) => triggerTagTranslations(l) }))

let existing: any = null
const inserted = vi.fn()
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: existing }) }) }),
      insert: (row: any) => { inserted(row); return { select: () => ({ single: async () => ({ data: { id: 'new', ...row } }) }) } },
    }),
  }),
}))

import { ensureTag } from '@/lib/actions/tags'

describe('ensureTag', () => {
  beforeEach(() => { vi.clearAllMocks(); existing = null })

  it('creates a new tag in the language the person writes in, and gets it translated into the others', async () => {
    const tag = await ensureTag('Decolonización', 'es')
    expect(inserted).toHaveBeenCalledWith({ slug: 'decolonizacion', names: { es: 'Decolonización' } })
    expect(tag).toEqual({ id: 'new', slug: 'decolonizacion', name: 'Decolonización' })
    await after.mock.lastCall![0]()
    expect(triggerTagTranslations.mock.calls.map((c) => c[0]).sort()).toEqual(['da', 'de', 'en', 'es', 'fr', 'pt'])
  })

  it('finds a tag that exists and shows it in the person’s language, without changing it', async () => {
    existing = { id: 't1', slug: 'decolonizacion', names: { en: 'Decolonization', es: 'Decolonización' } }
    expect(await ensureTag('decolonización', 'es')).toEqual({ id: 't1', slug: 'decolonizacion', name: 'Decolonización' })
    expect(await ensureTag('Decolonization', 'en')).toMatchObject({ name: 'Decolonization' })
    expect(inserted).not.toHaveBeenCalled()
    expect(after).not.toHaveBeenCalled()
  })

  it('refuses a name without letters', async () => {
    await expect(ensureTag('¡¿?!', 'es')).rejects.toThrow(/needs a name/)
  })
})
