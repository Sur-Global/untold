import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { setTagTopic } from '@/lib/actions/topics'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function db(error: { message: string } | null = null) {
  const eq = vi.fn().mockResolvedValue({ error })
  const update = vi.fn(() => ({ eq }))
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ update })) } as any)
  return { update, eq }
}

describe('setTagTopic', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the user is an administrator, saves it and refreshes the site', async () => {
    const { update, eq } = db()
    expect(await setTagTopic('t1', true)).toEqual({ ok: true })
    expect(requireAdmin).toHaveBeenCalled()
    expect(update).toHaveBeenCalledWith({ is_topic: true })
    expect(eq).toHaveBeenCalledWith('id', 't1')
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout')
  })

  it('can make a topic a plain tag again', async () => {
    const { update } = db()
    await setTagTopic('t1', false)
    expect(update).toHaveBeenCalledWith({ is_topic: false })
  })

  it('reports a database error instead of throwing', async () => {
    db({ message: 'permission denied' })
    expect(await setTagTopic('t1', true)).toEqual({ ok: false, error: 'permission denied' })
  })
})
