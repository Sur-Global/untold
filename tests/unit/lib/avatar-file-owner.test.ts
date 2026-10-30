import { describe, it, expect, vi, beforeEach } from 'vitest'

const BASE = 'https://example.supabase.co'
const ELSIE = 'a8e8b051-dd04-45f8-a68e-8cc37ff1000a'
const FRESH = '11111111-2222-4333-8444-555555555555'

describe('avatarFileOwner', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = BASE
    vi.resetModules()
  })

  it('reads the id a hosted photo is stored under, ignoring the cache-busting version', async () => {
    const { avatarFileOwner } = await import('@/lib/avatar-url')
    expect(avatarFileOwner(`${BASE}/storage/v1/object/public/avatars/${ELSIE}.webp?v=1793365158200`)).toBe(ELSIE)
  })

  it('returns nothing for photos that are not ours or have another name', async () => {
    const { avatarFileOwner } = await import('@/lib/avatar-url')
    expect(avatarFileOwner('https://elsewhere.org/avatars/' + ELSIE + '.webp')).toBeNull()
    expect(avatarFileOwner(`${BASE}/storage/v1/object/public/avatars/elsie-ralston.png`)).toBeNull()
    expect(avatarFileOwner(null)).toBeNull()
  })
})

describe('createAuthor photo', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = BASE
    vi.resetModules()
  })

  async function load(existingProfileIds: string[]) {
    const createUser = vi.fn().mockResolvedValue({ data: { user: { id: 'new-user' } }, error: null })
    const upsert = vi.fn().mockResolvedValue({ error: null })
    const service = {
      auth: { admin: { createUser } },
      from: () => ({
        select: () => ({
          eq: (_c: string, id: string) => ({
            maybeSingle: async () => ({ data: existingProfileIds.includes(id) ? { id } : null }),
          }),
        }),
        upsert,
      }),
    }
    vi.doMock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
    vi.doMock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: () => service }))
    vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }))
    vi.doMock('@/lib/require-editor', () => ({ requireEditor: vi.fn(), isEditorRole: () => true }))
    vi.doMock('@/lib/require-creator', () => ({ requireCreator: vi.fn() }))
    vi.doMock('@/lib/actions/activity-log', () => ({ logActivity: vi.fn() }))
    const { createAuthor } = await import('@/lib/actions/author')
    return { createAuthor, createUser }
  }

  it('refuses a photo stored under an existing profile (it would be shared and later replaced)', async () => {
    const { createAuthor, createUser } = await load([ELSIE])
    await expect(createAuthor({ displayName: 'Nueva Autora', avatarUrl: `${BASE}/storage/v1/object/public/avatars/${ELSIE}.webp?v=1` })).rejects.toThrow(/another profile/i)
    expect(createUser).not.toHaveBeenCalled()
  })

  it('accepts a photo stored under an id of its own', async () => {
    const { createAuthor, createUser } = await load([ELSIE])
    await createAuthor({ displayName: 'Nueva Autora', avatarUrl: `${BASE}/storage/v1/object/public/avatars/${FRESH}.webp?v=1` })
    expect(createUser).toHaveBeenCalledTimes(1)
  })
})
