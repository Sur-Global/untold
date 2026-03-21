import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('translateTexts', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
    process.env.DEEPL_API_KEY = 'test-key:fx'
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.DEEPL_API_KEY
    vi.resetModules()
  })

  it('calls the free-tier URL when key ends in :fx', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translations: [{ text: 'Hola' }, { text: 'Mundo' }] }),
    } as Response)

    const { translateTexts } = await import('@/lib/deepl')
    await translateTexts(['Hello', 'World'], 'es')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('api-free.deepl.com')
  })

  it('calls the pro URL when key does not end in :fx', async () => {
    process.env.DEEPL_API_KEY = 'pro-key-abc123'
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translations: [{ text: 'Bonjour' }] }),
    } as Response)

    const { translateTexts } = await import('@/lib/deepl')
    await translateTexts(['Hello'], 'fr')

    const [url] = vi.mocked(fetch).mock.calls[0]
    expect(String(url)).toContain('api.deepl.com')
    expect(String(url)).not.toContain('api-free')
  })

  it('returns translated strings in order', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translations: [{ text: 'Hola' }, { text: 'Mundo' }] }),
    } as Response)

    const { translateTexts } = await import('@/lib/deepl')
    const result = await translateTexts(['Hello', 'World'], 'es')
    expect(result).toEqual(['Hola', 'Mundo'])
  })

  it('throws on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    } as Response)

    const { translateTexts } = await import('@/lib/deepl')
    await expect(translateTexts(['Hello'], 'es')).rejects.toThrow('429')
  })

  it('sends Authorization header with DeepL-Auth-Key scheme', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ translations: [{ text: 'Hola' }] }),
    } as Response)

    const { translateTexts } = await import('@/lib/deepl')
    await translateTexts(['Hello'], 'es')

    const [, init] = vi.mocked(fetch).mock.calls[0]
    const headers = init?.headers as Record<string, string>
    expect(headers['Authorization']).toBe('DeepL-Auth-Key test-key:fx')
  })
})

describe('SUPPORTED_LOCALES', () => {
  it('contains exactly es, pt, fr, de, da', async () => {
    const { SUPPORTED_LOCALES } = await import('@/lib/deepl')
    expect([...SUPPORTED_LOCALES].sort()).toEqual(['da', 'de', 'es', 'fr', 'pt'])
  })
})
