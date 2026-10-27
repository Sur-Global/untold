import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { savePodcastBanner } from '@/lib/actions/podcast-banner'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function db(error: { message: string } | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error })
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ upsert })) } as any)
  return upsert
}

describe('savePodcastBanner', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the user is an administrator, saves the cleaned banner in its own row and refreshes the podcasts page', async () => {
    const upsert = db()
    const result = await savePodcastBanner({ enabled: true, links: { spotify: 'https://open.spotify.com/show/1', youtube: 'javascript:alert(1)' } })
    expect(requireAdmin).toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
    const [row, opts] = upsert.mock.calls[0]
    expect(row.id).toBe('podcast_banner')
    expect(row.settings.enabled).toBe(true)
    expect(row.settings.links.spotify).toBe('https://open.spotify.com/show/1')
    expect(row.settings.links.youtube).toBe('')
    expect(opts).toEqual({ onConflict: 'id' })
    expect(vi.mocked(revalidatePath).mock.calls.some(([path]) => String(path).endsWith('/podcasts'))).toBe(true)
  })

  it('reports a database error instead of throwing', async () => {
    db({ message: 'permission denied' })
    expect(await savePodcastBanner({})).toEqual({ ok: false, error: 'permission denied' })
  })
})
