import { describe, it, expect, vi, beforeEach } from 'vitest'
import sharp from 'sharp'

const upload = vi.fn()
vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: () => ({
    storage: { from: (bucket: string) => ({ upload: (path: string, buf: Buffer) => { upload(bucket, path, buf); return { error: null } }, getPublicUrl: (path: string) => ({ data: { publicUrl: `https://files.test/${path}` } }) }) },
  }),
}))

import { processAndStoreImage } from '@/lib/image-upload'

async function picture(width: number) {
  return sharp({ create: { width, height: Math.round(width * 0.4), channels: 3, background: '#A1A1E9' } }).png().toBuffer()
}

describe('processAndStoreImage', () => {
  beforeEach(() => upload.mockClear())

  it('keeps a hero picture (the top of a course page) up to 2400 px wide, where a cover is cut to 1200', async () => {
    const original = await picture(3000)
    const heroUrl = await processAndStoreImage(original, 'hero', 'u1')
    const coverUrl = await processAndStoreImage(original, 'cover', 'u1')
    expect(heroUrl).toContain('heroes/u1/')
    expect(coverUrl).toContain('covers/u1/')
    const [hero, cover] = upload.mock.calls.map((call) => call[2] as Buffer)
    expect((await sharp(hero).metadata()).width).toBe(2400)
    expect((await sharp(cover).metadata()).width).toBe(1200)
  })

  it('never enlarges a smaller hero picture', async () => {
    await processAndStoreImage(await picture(1600), 'hero', 'u1')
    expect((await sharp(upload.mock.calls[0][2] as Buffer).metadata()).width).toBe(1600)
  })
})
