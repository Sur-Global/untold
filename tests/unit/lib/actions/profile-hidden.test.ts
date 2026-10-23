import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-editor', () => ({ requireEditor: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/actions/activity-log', () => ({ logActivity: vi.fn(), getContentLogInfo: vi.fn() }))

import { toggleProfileHidden } from '@/lib/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { requireEditor } from '@/lib/require-editor'
import { logActivity } from '@/lib/actions/activity-log'

function db(target: object | null, updateError: { message: string } | null = null) {
  const eqUpdate = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq: eqUpdate }))
  const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), single: vi.fn().mockResolvedValue({ data: target }), update }
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any)
  return { update }
}
const as = (role: string) => vi.mocked(requireEditor).mockResolvedValue({ user: { id: 'u' }, profile: { role } } as any)

describe('toggleProfileHidden', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lets an admin hide a profile from the public site and logs it', async () => {
    as('admin')
    const { update } = db({ display_name: 'claude-test-verify', slug: 'user-f2237ace', hidden: false })
    await toggleProfileHidden('p1')
    expect(update).toHaveBeenCalledWith({ hidden: true })
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'hidden_from_public' }))
  })

  it('shows it again when it was hidden', async () => {
    as('admin')
    const { update } = db({ display_name: 'x', slug: 'x', hidden: true })
    await toggleProfileHidden('p1')
    expect(update).toHaveBeenCalledWith({ hidden: false })
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'shown_publicly' }))
  })

  it('is for admins only, not editors', async () => {
    as('editor')
    const { update } = db({ display_name: 'x', slug: 'x', hidden: false })
    await expect(toggleProfileHidden('p1')).rejects.toThrow('Only admins can hide a profile')
    expect(update).not.toHaveBeenCalled()
  })

  it('says so when the profile does not exist or saving fails', async () => {
    as('admin')
    db(null)
    await expect(toggleProfileHidden('nope')).rejects.toThrow('Profile not found')
    db({ display_name: 'x', slug: 'x', hidden: false }, { message: 'permission denied' })
    await expect(toggleProfileHidden('p1')).rejects.toThrow('permission denied')
  })
})
