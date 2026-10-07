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
  toggleHomeFeatured,
  toggleHeroFeatured,
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

// togglePlacement makes sequential from('content') calls: item lookup (.single()), then —
// only when turning ON — a slot count (awaited directly, no .single()), then the update.
// Build a distinct chain per call via mockImplementationOnce.
function makePlacementFrom(itemData: object | null, count: number | null) {
  const itemChain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: itemData }) }
  const countChain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn(), then: (resolve: any) => resolve({ count }) }
  countChain.eq.mockReturnValue(countChain)
  const updateChain: any = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({}) }
  const from = vi.fn()
    .mockImplementationOnce(() => itemChain)
    .mockImplementationOnce(() => countChain)
    .mockImplementationOnce(() => updateChain)
  return { from, countChain, updateChain }
}

const flags = { type: 'podcast', status: 'published', is_featured: false, is_home_featured: false, is_hero_featured: false }

function makeOffFrom(itemData: object) {
  const itemChain: any = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: itemData }) }
  const updateChain: any = { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({}) }
  const from = vi.fn().mockImplementationOnce(() => itemChain).mockImplementationOnce(() => updateChain)
  return { from, updateChain }
}

describe('toggleFeatured (★ type page)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

  it('turns on when under the per-type cap of 3, without touching other placements', async () => {
    const { from, updateChain, countChain } = makePlacementFrom(flags, 2)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    expect(await toggleFeatured('content-1')).toEqual({ ok: true })

    expect(updateChain.update).toHaveBeenCalledWith({ is_featured: true })
    expect(countChain.eq).toHaveBeenCalledWith('type', 'podcast')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/content')
  })

  it('names the page and slot usage when the cap is reached', async () => {
    const { from } = makePlacementFrom(flags, 3)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    const result = await toggleFeatured('content-1')
    expect(result.ok).toBe(false)
    expect(!result.ok && result.error).toContain('podcasts page are full (3 of 3)')
  })

  it('turns off without checking the cap and leaves home/hero alone', async () => {
    const { from, updateChain } = makeOffFrom({ ...flags, is_featured: true, is_hero_featured: true })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleFeatured('content-2')

    expect(updateChain.update).toHaveBeenCalledWith({ is_featured: false })
  })

  it('rejects unpublished content', async () => {
    const { from } = makePlacementFrom({ ...flags, status: 'draft' }, 0)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    expect(await toggleFeatured('content-1')).toEqual({ ok: false, error: 'Only published content can be placed' })
  })
})

describe('toggleHomeFeatured (⌂ homepage section)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

  it('uses the per-type cap (podcasts 4)', async () => {
    const { from } = makePlacementFrom(flags, 4)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    const result = await toggleHomeFeatured('content-1')
    expect(!result.ok && result.error).toContain('homepage podcasts section is full (4 of 4)')
  })

  it('courses only have 2 slots', async () => {
    const { from } = makePlacementFrom({ ...flags, type: 'course' }, 2)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    const result = await toggleHomeFeatured('content-1')
    expect(!result.ok && result.error).toContain('(2 of 2)')
  })

  it('turns on under the cap, even without ★', async () => {
    const { from, updateChain } = makePlacementFrom(flags, 3)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    expect(await toggleHomeFeatured('content-1')).toEqual({ ok: true })
    expect(updateChain.update).toHaveBeenCalledWith({ is_home_featured: true })
  })

  it('refuses an item that is already in the hero', async () => {
    const { from } = makePlacementFrom({ ...flags, is_hero_featured: true }, 0)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    const result = await toggleHomeFeatured('content-1')
    expect(!result.ok && result.error).toContain('already in the homepage hero')
  })
})

describe('toggleHeroFeatured (↑ homepage hero)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

  it('does not require ★', async () => {
    const { from, updateChain } = makePlacementFrom(flags, 2)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    expect(await toggleHeroFeatured('content-1')).toEqual({ ok: true })
    expect(updateChain.update).toHaveBeenCalledWith({ is_hero_featured: true, is_home_featured: false })
    expect(revalidatePath).toHaveBeenCalledWith('/')
  })

  it('counts across all types (no type filter) and rejects at 3', async () => {
    const { from, countChain } = makePlacementFrom(flags, 3)
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    const result = await toggleHeroFeatured('content-1')
    expect(!result.ok && result.error).toContain('The homepage hero is full (3 of 3)')
    expect(countChain.eq).not.toHaveBeenCalledWith('type', expect.anything())
  })

  it('turns off without checking the cap', async () => {
    const { from, updateChain } = makeOffFrom({ ...flags, is_hero_featured: true })
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await toggleHeroFeatured('content-1')
    expect(updateChain.update).toHaveBeenCalledWith({ is_hero_featured: false })
  })
})

describe('adminUnpublishContent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockViewer('admin')
  })

  it('sets status draft, clears published_at and every placement', async () => {
    const { from, chain } = makeDb()
    vi.mocked(createClient).mockResolvedValue({ from } as any)

    await adminUnpublishContent('content-3')

    expect(chain.update).toHaveBeenCalledWith({
      status: 'draft',
      published_at: null,
      is_featured: false,
      is_home_featured: false,
      is_hero_featured: false,
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
