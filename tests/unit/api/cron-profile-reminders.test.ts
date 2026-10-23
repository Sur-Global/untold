import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn(() => ({})) }))
vi.mock('@/lib/notify', () => ({ sendNotificationEmail: vi.fn() }))
vi.mock('@/lib/data/profile-reminders', () => ({ sendProfileReminders: vi.fn().mockResolvedValue({ checked: 2, sent: 1, failed: 1 }) }))

import { GET } from '@/app/api/cron/profile-reminders/route'
import { sendProfileReminders } from '@/lib/data/profile-reminders'

const call = (authorization?: string) =>
  GET(new Request('https://untold.example/api/cron/profile-reminders', { headers: authorization ? { authorization } : {} }))

describe('GET /api/cron/profile-reminders', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => { delete process.env.CRON_SECRET })

  it('refuses everyone but the scheduler (the secret Vercel sends)', async () => {
    process.env.CRON_SECRET = 'shh'
    expect((await call()).status).toBe(401)
    expect((await call('Bearer wrong')).status).toBe(401)
    expect(sendProfileReminders).not.toHaveBeenCalled()
  })

  it('refuses when no secret is configured at all', async () => {
    expect((await call('Bearer undefined')).status).toBe(401)
  })

  it('runs the reminders and reports the result', async () => {
    process.env.CRON_SECRET = 'shh'
    const res = await call('Bearer shh')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ checked: 2, sent: 1, failed: 1 })
  })
})
