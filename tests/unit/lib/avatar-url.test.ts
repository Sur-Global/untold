import { describe, it, expect, beforeEach } from 'vitest'
import { isHostedAvatarUrl, assertUploadedAvatar } from '@/lib/avatar-url'

const BASE = 'https://proj.supabase.co'
const OURS = `${BASE}/storage/v1/object/public/avatars/abc.webp?v=1`

describe('avatar URLs', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = BASE
  })

  it('recognises our own avatar uploads only', () => {
    expect(isHostedAvatarUrl(OURS)).toBe(true)
    expect(isHostedAvatarUrl('https://example.com/me.jpg')).toBe(false)
    expect(isHostedAvatarUrl(`${BASE}/storage/v1/object/public/content-images/covers/x.webp`)).toBe(false)
    expect(isHostedAvatarUrl(null)).toBe(false)
  })

  it('accepts an empty, unchanged or uploaded avatar', () => {
    expect(() => assertUploadedAvatar(null, 'https://old.example.com/a.jpg')).not.toThrow()
    expect(() => assertUploadedAvatar('https://old.example.com/a.jpg', 'https://old.example.com/a.jpg')).not.toThrow()
    expect(() => assertUploadedAvatar(OURS, null)).not.toThrow()
  })

  it('rejects a new link', () => {
    expect(() => assertUploadedAvatar('https://example.com/me.jpg', null)).toThrow('upload your photo')
  })
})
