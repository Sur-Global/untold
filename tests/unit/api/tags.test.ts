import { describe, it, expect, vi, beforeEach } from 'vitest'

const or = vi.fn()
let signedIn = true
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'u1' } : null } }) },
    from: () => ({ select: () => ({ or: (filter: string) => { or(filter); return { limit: async () => ({ data: rows }) } } }) }),
  }),
}))

let rows: any[] = []
import { GET } from '@/app/api/tags/route'

const call = (query: string) => GET({ nextUrl: new URL(`https://untold.example/api/tags?${query}`) } as any)

describe('GET /api/tags', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    signedIn = true
    rows = [{ id: 't1', slug: 'decolonialidad', names: { en: 'Decoloniality', es: 'Decolonialidad', pt: 'Decolonialidade' } }]
  })

  it('shows every suggestion in the language of the session', async () => {
    expect((await (await call('q=decol&locale=es')).json())[0].name).toBe('Decolonialidad')
    expect((await (await call('q=decol&locale=pt')).json())[0].name).toBe('Decolonialidade')
    expect((await (await call('q=decol&locale=en')).json())[0].name).toBe('Decoloniality')
  })

  it('shows English when the tag is not translated into that language yet', async () => {
    rows = [{ id: 't2', slug: 'memory', names: { en: 'Memory' } }]
    expect((await (await call('q=mem&locale=fr')).json())[0].name).toBe('Memory')
  })

  it('searches the name in that language, in English, and the slug (accents do not matter for the slug)', async () => {
    await call('q=Decolonizaci%C3%B3n&locale=es')
    const filter = or.mock.lastCall![0] as string
    expect(filter).toContain('slug.ilike.%decolonizacion%')
    expect(filter).toContain('names->>es.ilike.%Decolonización%')
    expect(filter).toContain('names->>en.ilike.%Decolonización%')
  })

  it('treats an unknown language as English, ignores characters that would break the filter, and needs a session', async () => {
    await call('q=a%2C(b)&locale=xx')
    expect(or.mock.lastCall![0]).toContain('names->>en.ilike.%a  b%')
    signedIn = false
    expect((await call('q=a')).status).toBe(401)
  })
})
