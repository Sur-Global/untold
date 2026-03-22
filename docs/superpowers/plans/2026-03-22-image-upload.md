# Image Upload & Optimisation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all image/thumbnail URL text inputs with a `CoverImageInput` component that accepts file upload or pasted URL, optimises uploads server-side via Sharp to WebP, and stores them in Supabase Storage.

**Architecture:** A `POST /api/upload` route handler accepts a file + type, runs it through Sharp (resize + compress + WebP), uploads to Supabase Storage using the service-role client, and returns the public URL. A shared `CoverImageInput` client component wraps the upload call and surfaces a drag-and-drop zone + URL fallback input. Existing server actions are unchanged — they already read the image field as a plain string from FormData.

**Tech Stack:** Next.js 16 App Router route handlers, Sharp (new dep), Supabase Storage, Vitest + testing-library, `@/lib/supabase/service-role` for storage uploads.

---

## File Map

**Create:**
- `supabase/migrations/20260323000002_storage_buckets.sql` — bucket definitions + RLS policies
- `app/api/upload/route.ts` — POST handler: auth, validate, Sharp pipeline, Storage upload
- `components/ui/CoverImageInput.tsx` — shared client component (upload zone + URL input)
- `tests/unit/api/upload.test.ts` — unit tests for the upload route
- `tests/unit/components/CoverImageInput.test.tsx` — unit tests for the component

**Modify:**
- `package.json` — add `sharp`
- `app/[locale]/create/article/CreateArticleForm.tsx` — replace URL input
- `app/[locale]/create/podcast/CreatePodcastForm.tsx` — replace URL input
- `app/[locale]/create/course/CreateCourseForm.tsx` — replace URL input
- `app/[locale]/create/video/CreateVideoForm.tsx` — replace thumbnail URL input
- `app/[locale]/create/pill/CreatePillForm.tsx` — replace image URL input
- `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx` — replace URL input
- `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx` — replace URL input
- `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx` — replace URL input
- `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` — replace thumbnail URL input
- `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` — replace image URL input
- `components/auth/CompleteProfileForm.tsx` — add avatar upload

---

## Task 1: Storage Migration

**Files:**
- Create: `supabase/migrations/20260323000002_storage_buckets.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260323000002_storage_buckets.sql

-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('content-images', 'content-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- content-images: authenticated users can upload to their own sub-folder
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Authenticated users can update their content images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Public read for content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

-- avatars: authenticated users can upload/replace their own avatar only
CREATE POLICY "Authenticated users can upload their avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Authenticated users can update their avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND name = auth.uid()::text || '.webp');

CREATE POLICY "Public read for avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');
```

Note: path for cover images is `covers/{userId}/{uuid}.webp`. `storage.foldername` returns a 1-based PostgreSQL array of path segments — `[1]` = `'covers'`, `[2]` = the userId.

- [ ] **Step 2: Apply migration to remote**

```bash
npx supabase db push
```

Expected: migration runs with no errors. If you see "policy already exists", it's safe — the `ON CONFLICT DO NOTHING` on buckets handles re-runs.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260323000002_storage_buckets.sql
git commit -m "feat: add content-images and avatars storage buckets with RLS"
```

---

## Task 2: Install Sharp + Upload API Route

**Files:**
- Modify: `package.json`
- Create: `app/api/upload/route.ts`
- Create: `tests/unit/api/upload.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/api/upload.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- tests/unit/api/upload.test.ts
```

Expected: FAIL with "Cannot find module '@/app/api/upload/route'" (or similar import error).

- [ ] **Step 3: Install sharp**

```bash
npm install sharp
```

- [ ] **Step 4: Create the upload route**

Create `app/api/upload/route.ts`:

```ts
import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  const type = formData.get('type') as string | null

  if (!file || !file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Invalid file — must be an image' }, { status: 400 })
  }
  if (type !== 'cover' && type !== 'avatar') {
    return NextResponse.json({ error: 'Invalid type — must be cover or avatar' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File too large — max 5 MB' }, { status: 413 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    let processed: Buffer
    let storagePath: string
    let bucket: string

    if (type === 'cover') {
      processed = await sharp(buffer)
        .resize({ width: 1200, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer()
      storagePath = `covers/${user.id}/${crypto.randomUUID()}.webp`
      bucket = 'content-images'
    } else {
      processed = await sharp(buffer)
        .resize(256, 256, { fit: 'cover', position: 'centre' })
        .webp({ quality: 80 })
        .toBuffer()
      storagePath = `${user.id}.webp`
      bucket = 'avatars'
    }

    const storage = createServiceRoleClient()
    const { error: uploadError } = await storage.storage
      .from(bucket)
      .upload(storagePath, processed, { contentType: 'image/webp', upsert: true })

    if (uploadError) {
      return NextResponse.json({ error: 'Storage upload failed' }, { status: 500 })
    }

    const { data: { publicUrl } } = storage.storage.from(bucket).getPublicUrl(storagePath)
    return NextResponse.json({ url: publicUrl })
  } catch {
    return NextResponse.json({ error: 'Image processing failed' }, { status: 500 })
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test -- tests/unit/api/upload.test.ts
```

Expected: 5 tests passing.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/api/upload/route.ts tests/unit/api/upload.test.ts
git commit -m "feat: add POST /api/upload route with Sharp WebP optimisation"
```

---

## Task 3: CoverImageInput Component

**Files:**
- Create: `components/ui/CoverImageInput.tsx`
- Create: `tests/unit/components/CoverImageInput.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/CoverImageInput.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for upload
global.fetch = vi.fn()

import { CoverImageInput } from '@/components/ui/CoverImageInput'

describe('CoverImageInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders upload zone when no defaultValue', () => {
    render(<CoverImageInput name="cover_image_url" />)
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
  })

  it('renders image preview when defaultValue is set', () => {
    render(<CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByText(/click to upload/i)).not.toBeInTheDocument()
  })

  it('renders hidden input with the current url value', () => {
    const { container } = render(
      <CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />
    )
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement
    expect(hidden.value).toBe('https://example.com/img.webp')
  })

  it('clears preview and shows upload zone when Remove is clicked', () => {
    render(<CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />)
    fireEvent.click(screen.getByText(/remove/i))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
  })

  it('sets url from URL input when Use URL is clicked', () => {
    render(<CoverImageInput name="cover_image_url" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('shows error for invalid URL', () => {
    render(<CoverImageInput name="cover_image_url" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(screen.getByText(/valid URL/i)).toBeInTheDocument()
  })

  it('calls onChange when url changes via URL input', () => {
    const onChange = vi.fn()
    render(<CoverImageInput name="cover_image_url" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/photo.jpg')
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test -- tests/unit/components/CoverImageInput.test.tsx
```

Expected: FAIL — "Cannot find module '@/components/ui/CoverImageInput'".

- [ ] **Step 3: Implement CoverImageInput**

Create `components/ui/CoverImageInput.tsx`:

```tsx
'use client'

import { useState, useRef, useEffect } from 'react'
import { Label } from '@/components/ui/label'

interface CoverImageInputProps {
  name: string
  defaultValue?: string | null
  uploadType?: 'cover' | 'avatar'
  label?: string
  onChange?: (url: string) => void
}

export function CoverImageInput({
  name,
  defaultValue,
  uploadType = 'cover',
  label,
  onChange,
}: CoverImageInputProps) {
  const [url, setUrl] = useState(defaultValue ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAvatar = uploadType === 'avatar'
  const fieldLabel = label ?? (isAvatar ? 'Avatar' : 'Cover Image')

  useEffect(() => { onChange?.(url) }, [url, onChange])

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', uploadType)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.error ?? 'Upload failed')
        return
      }
      const { url: uploadedUrl } = await res.json()
      setUrl(uploadedUrl)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleUseUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed.startsWith('http')) { setError('Please enter a valid URL'); return }
    setError(null)
    setUrl(trimmed)
    setUrlInput('')
  }

  return (
    <div className="space-y-2">
      <Label>{fieldLabel}</Label>
      <input type="hidden" name={name} value={url} />

      {url ? (
        <div style={{ border: '1px solid rgba(139,69,19,0.15)', borderRadius: 10, overflow: 'hidden', background: '#FAF7F2' }}>
          <div
            style={{
              position: 'relative',
              ...(isAvatar
                ? { width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', margin: 12 }
                : { aspectRatio: '16/9' }),
              background: '#2c2420',
            }}
            className="group"
          >
            <img src={url} alt={fieldLabel} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            <div
              className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: 'rgba(44,36,32,0.5)' }}
            >
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'linear-gradient(160deg,#8b4513,#a0522d)', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}
              >
                ↑ Replace
              </button>
              <button
                type="button"
                onClick={() => setUrl('')}
                style={{ background: 'rgba(245,241,232,0.15)', color: '#F5F1E8', border: '1px solid rgba(245,241,232,0.25)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer' }}
              >
                ✕ Remove
              </button>
            </div>
          </div>
          {!isAvatar && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderTop: '1px solid rgba(139,69,19,0.1)' }}>
              <span style={{ fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6B5F58', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                {url.split('/').pop()}
              </span>
              <span style={{ fontSize: 10, fontFamily: 'JetBrains Mono, monospace', background: 'rgba(139,69,19,0.08)', color: '#8b4513', padding: '2px 8px', borderRadius: 20, border: '1px solid rgba(139,69,19,0.15)', whiteSpace: 'nowrap' }}>
                WebP
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ border: '1px solid rgba(139,69,19,0.15)', borderRadius: 10, overflow: 'hidden', background: '#FAF7F2' }}>
          <div
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: '2px dashed rgba(139,69,19,0.25)', borderRadius: 8, margin: 12, padding: '28px 16px', textAlign: 'center', cursor: 'pointer', background: 'rgba(139,69,19,0.03)' }}
          >
            {uploading ? (
              <div style={{ color: '#6B5F58', fontSize: 13 }}>Uploading…</div>
            ) : (
              <>
                <div style={{ width: 40, height: 40, margin: '0 auto 10px', background: 'rgba(139,69,19,0.08)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b4513', fontSize: 18 }}>↑</div>
                <div style={{ fontSize: 13, color: '#6B5F58', marginBottom: 3 }}>
                  <strong style={{ color: '#8b4513', fontWeight: 500 }}>Click to upload</strong> or drag & drop
                </div>
                <div style={{ fontSize: 11, color: '#9a8f87', fontFamily: 'JetBrains Mono, monospace' }}>
                  JPEG · PNG · WebP · max 5 MB → optimised to WebP
                </div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', marginBottom: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(139,69,19,0.12)' }} />
            <span style={{ fontSize: 11, color: '#9a8f87', fontFamily: 'JetBrains Mono, monospace', textTransform: 'uppercase', letterSpacing: '.5px' }}>or paste URL</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(139,69,19,0.12)' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px' }}>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleUseUrl() } }}
              placeholder="https://example.com/image.jpg"
              style={{ flex: 1, background: '#E8E2D5', border: '1px solid rgba(139,69,19,0.15)', borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#2C2420', outline: 'none' }}
            />
            <button
              type="button"
              onClick={handleUseUrl}
              style={{ background: '#E8E2D5', border: '1px solid rgba(139,69,19,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6B5F58', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Use URL
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
      />
      {error && <p style={{ fontSize: 12, color: '#dc2626' }}>{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm test -- tests/unit/components/CoverImageInput.test.tsx
```

Expected: 7 tests passing.

- [ ] **Step 5: Commit**

```bash
git add components/ui/CoverImageInput.tsx tests/unit/components/CoverImageInput.test.tsx
git commit -m "feat: add CoverImageInput component with upload zone and URL fallback"
```

---

## Task 4: Update All 10 Content Forms

**Files:** (all modify only — swap one `<div className="space-y-2">` block per form)

For each form, replace the existing URL input block with `<CoverImageInput>`. The `name` prop must match the field name the server action reads (see table below).

| Form | Old field | name prop |
|------|-----------|-----------|
| Create/Edit Article | `cover_image_url` | `"cover_image_url"` |
| Create/Edit Podcast | `cover_image_url` | `"cover_image_url"` |
| Create/Edit Course | `cover_image_url` | `"cover_image_url"` |
| Create/Edit Video | `thumbnail_url` | `"thumbnail_url"` |
| Create/Edit Pill | `image_url` | `"image_url"` |

- [ ] **Step 1: Add the import to each form that doesn't have it**

In every form file listed below, add this import at the top (with the other component imports):

```tsx
import { CoverImageInput } from '@/components/ui/CoverImageInput'
```

- [ ] **Step 2: Update `CreateArticleForm.tsx`**

File: `app/[locale]/create/article/CreateArticleForm.tsx`

Replace:
```tsx
      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder={t('coverImagePlaceholder')}
        />
      </div>
```

With:
```tsx
      <CoverImageInput name="cover_image_url" />
```

- [ ] **Step 3: Update `EditArticleForm.tsx`**

File: `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx`

Replace:
```tsx
      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          defaultValue={initialCoverImageUrl}
          placeholder={t('coverImagePlaceholder')}
        />
      </div>
```

With:
```tsx
      <CoverImageInput name="cover_image_url" defaultValue={initialCoverImageUrl} />
```

- [ ] **Step 4: Update `CreateVideoForm.tsx`**

File: `app/[locale]/create/video/CreateVideoForm.tsx`

Replace:
```tsx
      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
        <Input id="thumbnail_url" name="thumbnail_url" type="url" placeholder={t('thumbnailUrlPlaceholder')} />
      </div>
```

With:
```tsx
      <CoverImageInput name="thumbnail_url" />
```

- [ ] **Step 5: Update `EditVideoForm.tsx`**

File: `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`

Replace:
```tsx
      <div className="space-y-2">
        <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
        <Input
          id="thumbnail_url"
          name="thumbnail_url"
          type="url"
          defaultValue={initialThumbnailUrl}
          placeholder={t('thumbnailUrlPlaceholder')}
        />
      </div>
```

With:
```tsx
      <CoverImageInput name="thumbnail_url" defaultValue={initialThumbnailUrl} />
```

- [ ] **Step 6: Update the remaining 6 forms**

Apply the same pattern to:
- `app/[locale]/create/podcast/CreatePodcastForm.tsx` — field `cover_image_url`
- `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx` — field `cover_image_url`, defaultValue `initialCoverImageUrl`
- `app/[locale]/create/course/CreateCourseForm.tsx` — field `cover_image_url`
- `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx` — field `cover_image_url`, defaultValue `initialCoverImageUrl`
- `app/[locale]/create/pill/CreatePillForm.tsx` — field `image_url`
- `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` — field `image_url`, defaultValue `initialImageUrl`

For each: remove the `<div className="space-y-2">` block containing the old URL `<Input>` and replace with `<CoverImageInput name="<fieldname>" defaultValue={initialXxxUrl} />`.

Also remove the now-unused `Label` import if it's no longer used elsewhere in the file (check first — some forms use Label for other fields).

- [ ] **Step 7: Run the full test suite**

```bash
npm test
```

Expected: all existing tests pass. No regressions.

- [ ] **Step 8: Commit**

```bash
git add app/\[locale\]/create/ app/\[locale\]/dashboard/
git commit -m "feat: replace image URL inputs with CoverImageInput across all 10 content forms"
```

---

## Task 5: Profile Avatar Upload

**Files:**
- Modify: `components/auth/CompleteProfileForm.tsx`

- [ ] **Step 1: Read the current file**

Open `components/auth/CompleteProfileForm.tsx`. The component:
- Uses `useState` for `displayName`, `slug`, `slugError`, `loading`
- Calls `supabase.from('profiles').update({ display_name: displayName, slug }).eq('id', user.id)` in `handleSubmit`
- Does NOT currently have `avatar_url`

- [ ] **Step 2: Add avatar state and CoverImageInput**

In `components/auth/CompleteProfileForm.tsx`:

1. Add import at top:
```tsx
import { CoverImageInput } from '@/components/ui/CoverImageInput'
```

2. Add state inside the component (alongside the existing state declarations):
```tsx
const [avatarUrl, setAvatarUrl] = useState('')
```

3. Add `<CoverImageInput>` in the JSX, before the submit button:
```tsx
<div className="space-y-2">
  <CoverImageInput
    name="avatar_url"
    uploadType="avatar"
    onChange={setAvatarUrl}
  />
</div>
```

4. Include `avatar_url` in the `.update()` call in `handleSubmit`:
```tsx
const { error } = await (supabase as any)
  .from('profiles')
  .update({ display_name: displayName, slug, avatar_url: avatarUrl || null })
  .eq('id', user.id) as { error: { code: string; message: string } | null }
```

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/auth/CompleteProfileForm.tsx
git commit -m "feat: add avatar upload to complete-profile form"
```

---

## Final Verification

- [ ] **Run full test suite one last time**

```bash
npm test
```

Expected: all tests pass (no regressions).

- [ ] **Smoke test with Playwright**

```bash
# Open the article edit form
playwright-cli open http://localhost:3000/en/dashboard/articles

# Sign in as author (use test account from memory: reference_test_accounts.md)
# Navigate to an article edit page
# Verify CoverImageInput renders (upload zone + "or paste URL" section visible)
# Paste a URL, click "Use URL", verify preview appears
# Save the form and verify the cover_image_url is preserved
```
