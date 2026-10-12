import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/notify', () => ({
  FEATURE_REQUEST_EMAIL: 'team@example.com',
  sendNotificationEmail: vi.fn(),
}))

import { readFeatureRequest, syncFeatureRequest, notifyFeatureRequest } from '@/lib/feature-request'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendNotificationEmail } from '@/lib/notify'

describe('readFeatureRequest', () => {
  it('returns null when the form has no feature_requested field', () => {
    expect(readFeatureRequest(new FormData())).toBeNull()
  })
  it('reads true/false', () => {
    const fd = new FormData()
    fd.set('feature_requested', 'true')
    expect(readFeatureRequest(fd)).toBe(true)
    fd.set('feature_requested', 'false')
    expect(readFeatureRequest(fd)).toBe(false)
  })
})

// A tiny chainable fake: records every update() payload, returns canned rows for single()/select
function makeDb(row: object | null, claimed: Array<{ id: string }> = [{ id: 'c1' }]) {
  const updates: object[] = []
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: row })),
    update: vi.fn((payload: object) => {
      updates.push(payload)
      return chain
    }),
    then: (resolve: any) => resolve({ data: claimed }),
  }
  return { db: { from: vi.fn(() => chain) }, updates }
}

describe('syncFeatureRequest', () => {
  beforeEach(() => vi.clearAllMocks())

  it('does nothing when the form had no checkbox', async () => {
    const { db, updates } = makeDb({ feature_requested_at: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    await syncFeatureRequest('c1', null)
    expect(updates).toEqual([])
  })

  it('ticking starts a fresh, unresolved, unnotified request', async () => {
    const { db, updates } = makeDb({ feature_requested_at: null })
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    await syncFeatureRequest('c1', true)
    expect(updates).toHaveLength(1)
    expect(updates[0]).toMatchObject({ feature_request_resolved_at: null, feature_request_notified_at: null })
    expect((updates[0] as any).feature_requested_at).toBeTruthy()
  })

  it('saving with the box still ticked leaves an existing request (and its decision) alone', async () => {
    const { db, updates } = makeDb({ feature_requested_at: '2026-01-01' })
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    await syncFeatureRequest('c1', true)
    expect(updates).toEqual([])
  })

  it('unticking withdraws the request', async () => {
    const { db, updates } = makeDb({ feature_requested_at: '2026-01-01' })
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    await syncFeatureRequest('c1', false)
    expect(updates[0]).toEqual({ feature_requested_at: null, feature_request_resolved_at: null, feature_request_notified_at: null })
  })
})

describe('notifyFeatureRequest', () => {
  const pending = {
    id: 'c1', type: 'pill', slug: 'my-pill', status: 'published', source_locale: 'es',
    feature_requested_at: '2026-01-01', feature_request_resolved_at: null, feature_request_notified_at: null,
    profiles: { display_name: 'Ana' },
    content_translations: [{ locale: 'es', title: 'Mi píldora' }],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.test'
  })

  it('emails the team once about a published, pending request', async () => {
    const { db } = makeDb(pending)
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    vi.mocked(sendNotificationEmail).mockResolvedValue(true)

    await notifyFeatureRequest('c1')

    expect(sendNotificationEmail).toHaveBeenCalledTimes(1)
    const mail = vi.mocked(sendNotificationEmail).mock.calls[0][0]
    expect(mail.to).toBe('team@example.com')
    expect(mail.subject).toContain('Mi píldora')
    expect(mail.text).toContain('https://site.test/admin/requests')
  })

  it.each([
    ['a draft', { ...pending, status: 'draft' }],
    ['no request', { ...pending, feature_requested_at: null }],
    ['an already-resolved request', { ...pending, feature_request_resolved_at: '2026-01-02' }],
    ['an already-notified request', { ...pending, feature_request_notified_at: '2026-01-02' }],
  ])('does not email for %s', async (_label, row) => {
    const { db } = makeDb(row)
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    await notifyFeatureRequest('c1')
    expect(sendNotificationEmail).not.toHaveBeenCalled()
  })

  it('frees the request again when the email could not be sent, so a later publish retries', async () => {
    const { db, updates } = makeDb(pending)
    vi.mocked(createServiceRoleClient).mockReturnValue(db as any)
    vi.mocked(sendNotificationEmail).mockResolvedValue(false)

    await notifyFeatureRequest('c1')

    expect(updates.at(-1)).toEqual({ feature_request_notified_at: null })
  })
})
