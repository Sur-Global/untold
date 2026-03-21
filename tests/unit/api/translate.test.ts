import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))
vi.mock('@/lib/deepl', () => ({
  translateTexts: vi.fn(),
  SUPPORTED_LOCALES: ['es', 'pt', 'fr', 'de', 'da'],
}))
vi.mock('@/lib/tiptap-translate', () => ({
  extractTextNodes: vi.fn(() => ({ texts: [], paths: [] })),
  injectTextNodes: vi.fn((doc: unknown) => doc),
}))

import { POST } from '@/app/api/translate/route'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { translateTexts } from '@/lib/deepl'

const SECRET = 'test-secret-xyz'

function makeRequest(body: object, secret?: string) {
  return new NextRequest('http://localhost/api/translate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(secret ? { 'x-translate-secret': secret } : {}),
    },
    body: JSON.stringify(body),
  })
}

function makeChainMock(overrides: {
  singleValues?: Array<{ data: object | null }>
  maybySingleValue?: { data: object | null }
  upsertMock?: ReturnType<typeof vi.fn>
}) {
  const singleFn = vi.fn()
  overrides.singleValues?.forEach((v) => singleFn.mockResolvedValueOnce(v))

  const upsertMock = overrides.upsertMock ?? vi.fn().mockResolvedValue({ error: null })

  const chain: Record<string, unknown> = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: singleFn,
    maybeSingle: vi.fn().mockResolvedValue(overrides.maybySingleValue ?? { data: null }),
    upsert: upsertMock,
  }
  // eq() returns the same chain (for chaining .eq().eq())
  ;(chain.eq as ReturnType<typeof vi.fn>).mockReturnValue(chain)

  return { from: vi.fn().mockReturnValue(chain), upsertMock }
}

describe('POST /api/translate', () => {
  beforeEach(() => {
    process.env.TRANSLATE_API_SECRET = SECRET
    vi.clearAllMocks()
  })

  it('returns 401 when secret header is missing', async () => {
    const res = await POST(makeRequest({ contentId: 'abc' }))
    expect(res.status).toBe(401)
  })

  it('returns 401 when secret header is wrong', async () => {
    const res = await POST(makeRequest({ contentId: 'abc' }, 'wrong-secret'))
    expect(res.status).toBe(401)
  })

  it('returns 400 when contentId is missing', async () => {
    const res = await POST(makeRequest({}, SECRET))
    expect(res.status).toBe(400)
  })

  it('returns ok:true with translated locales on success', async () => {
    vi.mocked(translateTexts).mockResolvedValue(['Hola'])

    const { from } = makeChainMock({
      singleValues: [
        { data: { type: 'video' } },
        { data: { title: 'Hello', description: 'Desc', excerpt: null, body: null } },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue({ from } as any)

    const res = await POST(makeRequest({ contentId: 'content-123' }, SECRET))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(Array.isArray(json.translated)).toBe(true)
  })

  it('upserts with is_auto_translated: true', async () => {
    vi.mocked(translateTexts).mockResolvedValue(['Hola'])

    const { from, upsertMock } = makeChainMock({
      singleValues: [
        { data: { type: 'video' } },
        { data: { title: 'Hi', description: null, excerpt: null, body: null } },
      ],
    })
    vi.mocked(createServiceRoleClient).mockReturnValue({ from } as any)

    await POST(makeRequest({ contentId: 'cid', locale: 'es' }, SECRET))

    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ is_auto_translated: true }),
      expect.any(Object),
    )
  })

  it('skips locale where is_auto_translated is false (manually authored)', async () => {
    const { from, upsertMock } = makeChainMock({
      singleValues: [
        { data: { type: 'video' } },
        { data: { title: 'Hi', description: null, excerpt: null, body: null } },
      ],
      maybySingleValue: { data: { is_auto_translated: false } },
    })
    vi.mocked(createServiceRoleClient).mockReturnValue({ from } as any)

    await POST(makeRequest({ contentId: 'cid', locale: 'es' }, SECRET))

    expect(upsertMock).not.toHaveBeenCalled()
    expect(translateTexts).not.toHaveBeenCalled()
  })
})
