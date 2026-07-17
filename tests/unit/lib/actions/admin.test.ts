import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-editor', () => ({
  requireEditor: vi.fn(),
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
import { requireEditor } from '@/lib/require-editor'
import { revalidatePath } from 'next/cache'

function mockViewer(role: 'admin' | 'editor') {
  vi.mocked(requireEditor).mockResolvedValue({
    user: { id: 'viewer-id' } as any,
    profile: { id: 'viewer-id', role } as any,
  })
}

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

  it('updates profile role', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await setUserRole('user-1', 'author')

    expect(chain.update).toHaveBeenCalledWith({ role: 'author' })
    expect(revalidatePath).toHaveBeenCalledWith('/admin/users')
  })

  it('rejects an editor granting the admin role', async () => {
    mockViewer('editor')
    const { from } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await expect(setUserRole('user-1', 'admin')).rejects.toThrow('Only admins can grant the admin role')
  })

  it('rejects an editor modifying an existing admin', async () => {
    mockViewer('editor')
    const { from } = makeDb({ role: 'admin' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await expect(setUserRole('user-1', 'author')).rejects.toThrow('Only admins can modify admin accounts')
  })

  it('allows an editor to set a non-admin role on a non-admin user', async () => {
    mockViewer('editor')
    const { from, chain } = makeDb({ role: 'author' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await setUserRole('user-1', 'editor')

    expect(chain.update).toHaveBeenCalledWith({ role: 'editor' })
  })
})

describe('toggleSuspendUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

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

  it('rejects an editor banning an existing admin', async () => {
    mockViewer('editor')
    const { from } = makeDb({ role: 'admin', suspended_at: null })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await expect(toggleSuspendUser('user-5')).rejects.toThrow('Only admins can ban admin accounts')
  })

  it('allows an editor to ban a non-admin user', async () => {
    mockViewer('editor')
    const { from, chain } = makeDb({ role: 'author', suspended_at: null })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleSuspendUser('user-6')

    const updateArg = vi.mocked(chain.update).mock.calls[0][0]
    expect(updateArg.suspended_at).not.toBeNull()
  })
})

describe('deleteUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

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

  it('rejects an editor deleting an existing admin', async () => {
    mockViewer('editor')
    const { from } = makeDb({ role: 'admin' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await expect(deleteUser('user-7')).rejects.toThrow('Only admins can delete admin accounts')
  })

  it('allows an editor to delete a non-admin user', async () => {
    mockViewer('editor')
    const { from } = makeDb({ role: 'author' })
    vi.mocked(createClient).mockResolvedValue({ from } as any)
    const deleteUserFn = vi.fn().mockResolvedValue({ error: null })
    vi.mocked(createServiceRoleClient).mockReturnValue({
      auth: { admin: { deleteUser: deleteUserFn } },
    } as any)

    await deleteUser('user-8')

    expect(deleteUserFn).toHaveBeenCalledWith('user-8')
  })
})
