import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { subscribeToNewsletter } from '@/lib/actions/subscribe'

function form(entries: Record<string, string>) {
  const fd = new FormData()
  Object.entries(entries).forEach(([k, v]) => fd.set(k, v))
  return fd
}

describe('subscribeToNewsletter', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    process.env.SENDER_API_TOKEN = 'test-token'
    delete process.env.SENDER_GROUP_IDS
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('rejects an invalid email without calling Sender', async () => {
    expect(await subscribeToNewsletter(form({ email: 'not-an-email' }))).toEqual({ ok: false, code: 'invalid' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('silently succeeds for bots that fill the honeypot, without calling Sender', async () => {
    expect(await subscribeToNewsletter(form({ email: 'a@b.com', website: 'http://spam' }))).toEqual({ ok: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts a normalized subscriber to the Sender API with the bearer token and groups', async () => {
    process.env.SENDER_GROUP_IDS = 'g1, g2'
    fetchMock.mockResolvedValue({ ok: true })

    const result = await subscribeToNewsletter(form({ email: '  Ana@Example.COM ', firstname: ' Ana ' }))

    expect(result).toEqual({ ok: true })
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://api.sender.net/v2/subscribers')
    expect(init.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(init.body)).toEqual({ email: 'ana@example.com', firstname: 'Ana', groups: ['g1', 'g2'] })
  })

  it('omits optional fields when they are empty', async () => {
    fetchMock.mockResolvedValue({ ok: true })
    await subscribeToNewsletter(form({ email: 'a@b.com', firstname: '  ' }))
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ email: 'a@b.com' })
  })

  it('maps a Sender validation error (422) to invalid and other failures to failed', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 422, text: async () => 'bad' })
    expect(await subscribeToNewsletter(form({ email: 'a@b.com' }))).toEqual({ ok: false, code: 'invalid' })
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, text: async () => 'boom' })
    expect(await subscribeToNewsletter(form({ email: 'a@b.com' }))).toEqual({ ok: false, code: 'failed' })
  })

  it('fails (without calling Sender) when no API token is configured', async () => {
    delete process.env.SENDER_API_TOKEN
    expect(await subscribeToNewsletter(form({ email: 'a@b.com' }))).toEqual({ ok: false, code: 'failed' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns failed when the request itself throws', async () => {
    fetchMock.mockRejectedValue(new Error('network'))
    expect(await subscribeToNewsletter(form({ email: 'a@b.com' }))).toEqual({ ok: false, code: 'failed' })
  })
})
