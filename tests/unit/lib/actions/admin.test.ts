import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin-id' } }),
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import {
  toggleFeatured,
  adminUnpublishContent,
  setUserRole,
  toggleSuspendUser,
  deleteUser,
} from '@/lib/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { revalidatePath } from 'next/cache'

function makeDb(singleData: object | null = null) {
  const singleFn = vi.fn().mockResolvedValue({ data: singleData })
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    single: singleFn,
  }
  chain.eq.mockReturnValue(chain)
  chain.update.mockReturnValue(chain)
  const from = vi.fn().mockReturnValue(chain)
  return { from, chain }
}

describe('toggleFeatured', () => {
  beforeEach(() => vi.clearAllMocks())

  it('flips is_featured from false to true', async () => {
    const { from, chain } = makeDb({ is_featured: false })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleFeatured('content-1')

    expect(chain.update).toHaveBeenCalledWith({ is_featured: true })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })

  it('flips is_featured from true to false', async () => {
    const { from, chain } = makeDb({ is_featured: true })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleFeatured('content-2')

    expect(chain.update).toHaveBeenCalledWith({ is_featured: false })
  })
})

describe('adminUnpublishContent', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets status draft, clears published_at and is_featured', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await adminUnpublishContent('content-3')

    expect(chain.update).toHaveBeenCalledWith({
      status: 'draft',
      published_at: null,
      is_featured: false,
    })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })
})

describe('setUserRole', () => {
  beforeEach(() => vi.clearAllMocks())

  it('updates profile role', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await setUserRole('user-1', 'author')

    expect(chain.update).toHaveBeenCalledWith({ role: 'author' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })
})

describe('toggleSuspendUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets suspended_at when user is active (suspended_at is null)', async () => {
    const { from, chain } = makeDb({ suspended_at: null })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleSuspendUser('user-2')

    const updateArg = vi.mocked(chain.update).mock.calls[0][0]
    expect(updateArg.suspended_at).not.toBeNull()
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })

  it('clears suspended_at when user is already suspended', async () => {
    const { from, chain } = makeDb({ suspended_at: '2026-01-01T00:00:00Z' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleSuspendUser('user-3')

    expect(chain.update).toHaveBeenCalledWith({ suspended_at: null })
  })
})

describe('deleteUser', () => {
  beforeEach(() => vi.clearAllMocks())

  it('calls auth.admin.deleteUser and revalidates both paths', async () => {
    const deleteUserFn = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: { admin: { deleteUser: deleteUserFn } },
    } as any)

    await deleteUser('user-4')

    expect(deleteUserFn).toHaveBeenCalledWith('user-4')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })

  it('throws when deleteUser returns an error', async () => {
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: {
        admin: {
          deleteUser: vi.fn().mockResolvedValue({ error: { message: 'User not found' } }),
        },
      },
    } as any)

    await expect(deleteUser('bad-id')).rejects.toThrow('User not found')
  })
})
