import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-admin', () => ({ requireAdmin: vi.fn().mockResolvedValue({ user: { id: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { saveHomeBanners } from '@/lib/actions/home-banners'
import { requireAdmin } from '@/lib/require-admin'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

function db(error: { message: string } | null = null) {
  const upsert = vi.fn().mockResolvedValue({ error })
  vi.mocked(createClient).mockResolvedValue({ from: vi.fn(() => ({ upsert })) } as any)
  return upsert
}

describe('saveHomeBanners', () => {
  beforeEach(() => vi.clearAllMocks())

  it('checks the user is an administrator, saves the cleaned banners in their own row and refreshes the homepage', async () => {
    const upsert = db()
    const result = await saveHomeBanners({ top: { imageUrl: 'https://cdn/x.webp', linkUrl: 'javascript:alert(1)', enabled: true } })
    expect(requireAdmin).toHaveBeenCalled()
    expect(result).toEqual({ ok: true })
    const [row, opts] = upsert.mock.calls[0]
    expect(row.id).toBe('banners')
    expect(row.settings.top.imageUrl).toBe('https://cdn/x.webp')
    expect(row.settings.top.linkUrl).toBe('')
    expect(row.settings.bottom.enabled).toBe(true)
    expect(opts).toEqual({ onConflict: 'id' })
    expect(revalidatePath).toHaveBeenCalled()
  })

  it('reports a database error instead of throwing', async () => {
    db({ message: 'permission denied' })
    expect(await saveHomeBanners({})).toEqual({ ok: false, error: 'permission denied' })
  })
})
