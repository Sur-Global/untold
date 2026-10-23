import { describe, it, expect, vi, beforeEach } from 'vitest'

let tags: any[] = []
const updates: { id: string; names: any }[] = []
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    from: () => ({
      select: async () => ({ data: tags }),
      update: (values: any) => ({ eq: async (_: string, id: string) => { updates.push({ id, names: values.names }); return {} } }),
    }),
  }),
}))
const translateTexts = vi.fn(async (texts: string[], target: string, _source?: string) => texts.map((t) => `${t}→${target}`))
vi.mock('@/lib/deepl', async (importOriginal) => ({ ...(await importOriginal<any>()), translateTexts: (...args: any[]) => (translateTexts as any)(...args) }))

import { POST } from '@/app/api/translate-tags/route'

const call = (locale: string) =>
  POST(new Request('https://untold.example/api/translate-tags', { method: 'POST', headers: { 'x-translate-secret': 'shh' }, body: JSON.stringify({ locale }) }) as any)

describe('POST /api/translate-tags', () => {
  beforeEach(() => { vi.clearAllMocks(); updates.length = 0; process.env.TRANSLATE_API_SECRET = 'shh' })

  it('translates a tag written in Spanish from Spanish, and one written in English from English', async () => {
    tags = [
      { id: 'a', names: { es: 'Memoria' } },
      { id: 'b', names: { en: 'Memory', es: 'Memoria' } },
      { id: 'c', names: { en: 'Land', pt: 'Terra' } },
    ]
    const res = await call('pt')
    expect((await res.json()).translated).toBe(2)
    expect(translateTexts).toHaveBeenCalledWith(['Memoria'], 'pt', 'es')
    expect(translateTexts).toHaveBeenCalledWith(['Memory'], 'pt', 'en')
    expect(updates.find((u) => u.id === 'a')!.names).toEqual({ es: 'Memoria', pt: 'Memoria→pt' })
    expect(updates.find((u) => u.id === 'b')!.names).toEqual({ en: 'Memory', es: 'Memoria', pt: 'Memory→pt' })
    expect(updates.find((u) => u.id === 'c')).toBeUndefined()
  })

  it('fills in the English name of a tag that only exists in Spanish', async () => {
    tags = [{ id: 'a', names: { es: 'Memoria' } }]
    await call('en')
    expect(updates[0].names).toEqual({ es: 'Memoria', en: 'Memoria→en' })
  })
})
