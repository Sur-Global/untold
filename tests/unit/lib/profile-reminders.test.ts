import { describe, it, expect, vi } from 'vitest'
import { sendProfileReminders } from '@/lib/data/profile-reminders'

const NOW = new Date('2026-10-20T14:00:00Z')
const profile = (id: string, extra: Record<string, any> = {}) => ({
  id, display_name: 'pat', avatar_url: null, created_at: '2026-10-10T10:00:00Z', profile_reminders_sent: 0, ...extra,
})

function fakeService(profiles: any[], accounts: Record<string, { email?: string; last_sign_in_at?: string | null }>) {
  const updates: any[] = []
  const chain: any = new Proxy({}, {
    get: (_t, prop) => {
      if (prop === 'then') return (res: any) => res({ data: profiles })
      if (prop === 'update') return (values: any) => ({ eq: (_c: string, id: string) => { updates.push({ id, values }); return Promise.resolve({}) } })
      return () => chain
    },
  })
  const service: any = {
    from: () => chain,
    auth: { admin: { getUserById: async (id: string) => ({ data: { user: accounts[id] ?? null } }) } },
  }
  return { service, updates }
}

describe('sendProfileReminders', () => {
  it('writes to a creator who signed in, has an incomplete profile and is due, and records it', async () => {
    const { service, updates } = fakeService([profile('a')], { a: { email: 'pat@example.com', last_sign_in_at: '2026-10-10T11:00:00Z' } })
    const send = vi.fn().mockResolvedValue(true)
    const result = await sendProfileReminders({ service, send, siteUrl: 'https://untold.example', now: NOW })
    expect(result).toEqual({ checked: 1, sent: 1, failed: 0 })
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ to: 'pat@example.com', subject: expect.stringContaining('Completa tu perfil') }))
    expect(updates).toEqual([{ id: 'a', values: { profile_reminders_sent: 1, profile_reminder_at: NOW.toISOString() } }])
  })

  it('skips profiles that are complete, not yet due, or never signed in (imported placeholders)', async () => {
    const { service, updates } = fakeService(
      [
        profile('complete', { display_name: 'Pat López', avatar_url: 'https://x/a.webp' }),
        profile('new', { created_at: '2026-10-19T10:00:00Z' }),
        profile('imported'),
        profile('done', { profile_reminders_sent: 2 }),
      ],
      {
        complete: { email: 'c@example.com', last_sign_in_at: '2026-10-11T00:00:00Z' },
        new: { email: 'n@example.com', last_sign_in_at: '2026-10-19T11:00:00Z' },
        imported: { email: 'x@placeholder.invalid', last_sign_in_at: null },
        done: { email: 'd@example.com', last_sign_in_at: '2026-10-11T00:00:00Z' },
      },
    )
    const send = vi.fn().mockResolvedValue(true)
    expect(await sendProfileReminders({ service, send, siteUrl: 'https://untold.example', now: NOW })).toEqual({ checked: 0, sent: 0, failed: 0 })
    expect(send).not.toHaveBeenCalled()
    expect(updates).toEqual([])
  })

  it('does not count a reminder that could not be sent, so it is tried again tomorrow', async () => {
    const { service, updates } = fakeService([profile('a')], { a: { email: 'pat@example.com', last_sign_in_at: '2026-10-10T11:00:00Z' } })
    const send = vi.fn().mockResolvedValue(false)
    expect(await sendProfileReminders({ service, send, siteUrl: 'https://untold.example', now: NOW })).toEqual({ checked: 1, sent: 0, failed: 1 })
    expect(updates).toEqual([])
  })

  it('sends the second one as number 2 after day 10', async () => {
    const { service, updates } = fakeService([profile('a', { created_at: '2026-10-01T10:00:00Z', profile_reminders_sent: 1 })], { a: { email: 'pat@example.com', last_sign_in_at: '2026-10-02T00:00:00Z' } })
    const send = vi.fn().mockResolvedValue(true)
    await sendProfileReminders({ service, send, siteUrl: 'https://untold.example', now: NOW })
    expect(send.mock.calls[0][0].text).toContain('último recordatorio')
    expect(updates[0].values.profile_reminders_sent).toBe(2)
  })
})
