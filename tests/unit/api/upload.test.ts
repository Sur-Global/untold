// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock sharp before importing route
vi.mock('sharp', () => {
  const chain = {
    resize: vi.fn().mockReturnThis(),
    webp: vi.fn().mockReturnThis(),
    toBuffer: vi.fn().mockResolvedValue(Buffer.from('fake-webp')),
  }
  return { default: vi.fn().mockReturnValue(chain) }
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

vi.mock('@/lib/supabase/service-role', () => ({
  createServiceRoleClient: vi.fn(),
}))

import { POST } from '@/app/api/upload/route'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([Buffer.alloc(sizeBytes, 'a')], name, { type })
}

function makeRequest(file?: File, type?: string): NextRequest {
  const fd = new FormData()
  if (file) fd.append('file', file)
  if (type) fd.append('type', type)
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd })
}

function makeStorageMock() {
  const from = vi.fn().mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/content-images/covers/user-1/abc.webp' },
    }),
  })
  return { storage: { from } }
}

describe('POST /api/upload', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('no auth') }) },
    } as any)
    const res = await POST(makeRequest(makeFile('img.jpg', 'image/jpeg', 100), 'cover'))
    expect(res.status).toBe(401)
  })

  it('returns 413 when file exceeds 5 MB', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const res = await POST(makeRequest(makeFile('big.jpg', 'image/jpeg', 6 * 1024 * 1024), 'cover'))
    expect(res.status).toBe(413)
  })

  it('returns 400 for non-image file', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    const res = await POST(makeRequest(makeFile('doc.pdf', 'application/pdf', 100), 'cover'))
    expect(res.status).toBe(400)
  })

  it('returns { url } ending in .webp for valid cover upload', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    vi.mocked(createServiceRoleClient).mockReturnValue(makeStorageMock() as any)
    const res = await POST(makeRequest(makeFile('photo.jpg', 'image/jpeg', 100), 'cover'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.url).toMatch(/\.webp/)
  })

  it('returns { url } for valid avatar upload', async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
    } as any)
    vi.mocked(createServiceRoleClient).mockReturnValue(makeStorageMock() as any)
    const res = await POST(makeRequest(makeFile('avatar.png', 'image/png', 100), 'avatar'))
    expect(res.status).toBe(200)
  })
})
