import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-editor', () => ({ requireEditor: vi.fn().mockResolvedValue({ user: { id: 'u' }, profile: { role: 'editor' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleClient: vi.fn() }))
vi.mock('@/lib/actions/activity-log', () => ({
  logActivity: vi.fn(),
  getContentLogInfo: vi.fn().mockResolvedValue({ type: 'article', label: 'Viejos mitos' }),
}))

import { toggleEditorial } from '@/lib/actions/admin'
import { createClient } from '@/lib/supabase/server'
import { logActivity } from '@/lib/actions/activity-log'
import { requireEditor } from '@/lib/require-editor'

function db(item: object | null, updateError: { message: string } | null = null) {
  const eqUpdate = vi.fn().mockResolvedValue({ error: updateError })
  const update = vi.fn(() => ({ eq: eqUpdate }))
  const chain: any = { select: vi.fn(() => chain), eq: vi.fn(() => chain), single: vi.fn().mockResolvedValue({ data: item }), update }
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => chain) } as any)
  return { update }
}

describe('toggleEditorial', () => {
  beforeEach(() => vi.clearAllMocks())

  it('marks a published article as the editorial and logs it', async () => {
    const { update } = db({ type: 'article', status: 'published', is_editorial: false })
    expect(await toggleEditorial('a1')).toEqual({ ok: true })
    expect(requireEditor).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ is_editorial: true })
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'editorial_on' }))
  })

  it('removes the mark when it is already on', async () => {
    const { update } = db({ type: 'article', status: 'published', is_editorial: true })
    expect(await toggleEditorial('a1')).toEqual({ ok: true })
    expect(update).toHaveBeenCalledWith({ is_editorial: false })
    expect(logActivity).toHaveBeenCalledWith(expect.objectContaining({ action: 'editorial_off' }))
  })

  it('only accepts articles and published ones', async () => {
    const video = db({ type: 'video', status: 'published', is_editorial: false })
    expect(await toggleEditorial('v1')).toEqual({ ok: false, error: 'Only articles can be an editorial' })
    expect(video.update).not.toHaveBeenCalled()
    const draft = db({ type: 'article', status: 'draft', is_editorial: false })
    expect(await toggleEditorial('a2')).toEqual({ ok: false, error: 'Only published articles can be an editorial' })
    expect(draft.update).not.toHaveBeenCalled()
  })

  it('says so when the article does not exist or saving fails', async () => {
    db(null)
    expect(await toggleEditorial('x')).toEqual({ ok: false, error: 'Content not found' })
    db({ type: 'article', status: 'published', is_editorial: false }, { message: 'permission denied' })
    expect(await toggleEditorial('a1')).toEqual({ ok: false, error: 'permission denied' })
  })
})
