import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-editor', () => ({ requireEditor: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/notify', () => ({ sendNotificationEmail: vi.fn() }))
vi.mock('@/lib/actions/activity-log', () => ({
  logActivity: vi.fn(),
  getContentLogInfo: vi.fn().mockResolvedValue({ type: 'pill', label: 'Mi píldora' }),
}))
vi.mock('@/lib/actions/admin', () => ({ setContentPlacement: vi.fn().mockResolvedValue({ ok: true }) }))

import { assignFeatureRequest, resolveFeatureRequest } from '@/lib/actions/feature-requests'
import { requireEditor } from '@/lib/require-editor'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendNotificationEmail } from '@/lib/notify'
import { setContentPlacement } from '@/lib/actions/admin'

function viewer(role: 'admin' | 'editor', id = 'me') {
  vi.mocked(requireEditor).mockResolvedValue({ user: { id } as any, profile: { id, role, display_name: 'Elsie' } as any })
}

// Serves canned rows per table; records content updates
function makeDb(rows: { profile?: any; content?: any }) {
  const updates: object[] = []
  const from = vi.fn((table: string) => {
    const chain: any = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      single: vi.fn(async () => ({ data: table === 'profiles' ? rows.profile : rows.content })),
      update: vi.fn((p: object) => {
        updates.push(p)
        return { eq: vi.fn(async () => ({ error: null })) }
      }),
    }
    return chain
  })
  return { db: { from }, updates }
}

describe('assignFeatureRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SITE_URL = 'https://site.test'
    vi.mocked(sendNotificationEmail).mockResolvedValue(true)
  })

  it('only admins can assign', async () => {
    viewer('editor')
    expect(await assignFeatureRequest('c1', 'ed1', 'hi')).toEqual({ ok: false, error: 'Only admins can assign requests' })
  })

  it('refuses a reviewer who is not an editor or admin', async () => {
    viewer('admin')
    const { db } = makeDb({ profile: { id: 'u1', role: 'author', display_name: 'Ana' } })
    vi.mocked(createClient).mockResolvedValue(db as any)
    const result = await assignFeatureRequest('c1', 'u1')
    expect(result.ok).toBe(false)
  })

  it('saves the assignment and emails the editor the instructions', async () => {
    viewer('admin')
    const { db, updates } = makeDb({
      profile: { id: 'ed1', role: 'editor', display_name: 'Eli' },
      content: { id: 'c1', type: 'pill', slug: 'mi-pildora', source_locale: 'es', content_translations: [{ locale: 'es', title: 'Mi píldora' }] },
    })
    vi.mocked(createClient).mockResolvedValue(db as any)
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'eli@example.com' } } }) } },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { email: null } }) }) }) }),
    } as any)

    const result = await assignFeatureRequest('c1', 'ed1', '  Check the sources first  ')

    expect(result).toEqual({ ok: true, emailed: true })
    expect(updates[0]).toMatchObject({ feature_review_assigned_to: 'ed1', feature_review_note: 'Check the sources first' })
    const mail = vi.mocked(sendNotificationEmail).mock.calls[0][0]
    expect(mail.to).toBe('eli@example.com')
    expect(mail.text).toContain('Check the sources first')
    expect(mail.text).toContain('https://site.test/admin/requests')
    expect(mail.subject).toContain('Mi píldora')
  })

  it('still saves the assignment when the editor has no email on file, and reports it', async () => {
    viewer('admin')
    const { db, updates } = makeDb({
      profile: { id: 'ed1', role: 'admin', display_name: 'Eli' },
      content: { id: 'c1', type: 'pill', slug: 's', source_locale: 'es', content_translations: [] },
    })
    vi.mocked(createClient).mockResolvedValue(db as any)
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: null } }) } },
      from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: { email: null } }) }) }) }),
    } as any)

    expect(await assignFeatureRequest('c1', 'ed1')).toEqual({ ok: true, emailed: false })
    expect(updates).toHaveLength(1)
    expect(sendNotificationEmail).not.toHaveBeenCalled()
  })
})

describe('resolveFeatureRequest permissions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('an editor cannot decide a request assigned to someone else', async () => {
    viewer('editor', 'ed1')
    const { db } = makeDb({ content: { feature_review_assigned_to: 'ed2' } })
    vi.mocked(createClient).mockResolvedValue(db as any)
    expect(await resolveFeatureRequest('c1', 'home')).toEqual({ ok: false, error: 'This request is not assigned to you' })
    expect(setContentPlacement).not.toHaveBeenCalled()
  })

  it('an editor can decide a request assigned to them', async () => {
    viewer('editor', 'ed1')
    const { db } = makeDb({ content: { feature_review_assigned_to: 'ed1' } })
    vi.mocked(createClient).mockResolvedValue(db as any)
    expect(await resolveFeatureRequest('c1', 'home')).toEqual({ ok: true })
    expect(setContentPlacement).toHaveBeenCalledWith('c1', 'home')
  })

  it('an admin can decide any request, and slot-full errors come back as errors', async () => {
    viewer('admin')
    const { db } = makeDb({ content: {} })
    vi.mocked(createClient).mockResolvedValue(db as any)
    vi.mocked(setContentPlacement).mockResolvedValueOnce({ ok: false, error: 'The homepage hero is full (3 of 3).' })
    expect(await resolveFeatureRequest('c1', 'hero')).toEqual({ ok: false, error: 'The homepage hero is full (3 of 3).' })
  })
})
