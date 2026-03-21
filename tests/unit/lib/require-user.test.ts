import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: vi.fn().mockImplementation(() => { throw new Error('NEXT_REDIRECT') }) }))

import { requireUser } from '@/lib/require-user'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

function makeSupabaseMock(opts: { userId?: string; suspendedAt?: string | null } = {}) {
  const singleFn = vi.fn().mockResolvedValue({
    data: opts.userId ? { suspended_at: opts.suspendedAt ?? null } : null,
  })
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts.userId ? { id: opts.userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: singleFn,
    }),
  }
}

describe('requireUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('redirects to /auth/login when not authenticated', async () => {
    vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as any)
    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })

  it('redirects to /suspended when user has suspended_at set', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ userId: 'user-1', suspendedAt: '2026-01-01T00:00:00Z' }) as any,
    )
    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT')
    expect(redirect).toHaveBeenCalledWith('/suspended')
  })

  it('returns { user } when authenticated and not suspended', async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabaseMock({ userId: 'user-1', suspendedAt: null }) as any,
    )
    const result = await requireUser()
    expect((result.user as any).id).toBe('user-1')
  })
})
