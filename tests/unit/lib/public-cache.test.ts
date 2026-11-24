import { describe, it, expect, vi, beforeEach } from 'vitest'

const revalidateTag = vi.fn()
vi.mock('next/cache', () => ({ revalidateTag: (...a: unknown[]) => revalidateTag(...a) }))

import { publicCachedFetch, liveFetchClearingCache, PUBLIC_CACHE_TAG, PUBLIC_CACHE_SECONDS } from '@/lib/supabase/public-cache'

const BASE = 'https://x.supabase.co'
let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  revalidateTag.mockReset()
  fetchMock = vi.fn(async () => new Response('[]', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
})

describe('publicCachedFetch (visitors without a session)', () => {
  it('remembers database reads with the public tag', async () => {
    await publicCachedFetch(`${BASE}/rest/v1/content?select=id`, { method: 'GET' })
    expect(fetchMock.mock.calls[0][1].next).toEqual({ revalidate: PUBLIC_CACHE_SECONDS, tags: [PUBLIC_CACHE_TAG] })
  })

  it('does not remember sign-in calls or counts (HEAD)', async () => {
    await publicCachedFetch(`${BASE}/auth/v1/user`, { method: 'GET' })
    await publicCachedFetch(`${BASE}/rest/v1/content?select=id`, { method: 'HEAD' })
    expect(fetchMock.mock.calls[0][1].next).toBeUndefined()
    expect(fetchMock.mock.calls[1][1].next).toBeUndefined()
  })

  it('a save clears the remembered answers; a stored-function call does not', async () => {
    await publicCachedFetch(`${BASE}/rest/v1/subscribers`, { method: 'POST' })
    expect(revalidateTag).toHaveBeenCalledWith(PUBLIC_CACHE_TAG, { expire: 0 })
    revalidateTag.mockReset()
    await publicCachedFetch(`${BASE}/rest/v1/rpc/search`, { method: 'POST' })
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

describe('liveFetchClearingCache (signed-in people, service role)', () => {
  it('never remembers reads', async () => {
    await liveFetchClearingCache(`${BASE}/rest/v1/content?select=id`, { method: 'GET' })
    expect(fetchMock.mock.calls[0][1].next).toBeUndefined()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it('clears the public answers after a successful save, not after a failed one', async () => {
    await liveFetchClearingCache(`${BASE}/rest/v1/content?id=eq.1`, { method: 'PATCH' })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 400 }))
    await liveFetchClearingCache(`${BASE}/rest/v1/content?id=eq.1`, { method: 'PATCH' })
    expect(revalidateTag).toHaveBeenCalledTimes(1)
  })

  it('a clear that is not allowed (while drawing a page) is skipped quietly', async () => {
    revalidateTag.mockImplementationOnce(() => { throw new Error('not allowed during render') })
    await expect(liveFetchClearingCache(`${BASE}/rest/v1/content`, { method: 'DELETE' })).resolves.toBeInstanceOf(Response)
  })
})
