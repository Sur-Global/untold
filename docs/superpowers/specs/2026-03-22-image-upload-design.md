# Image Upload & Optimisation Design Spec

**Date:** 2026-03-22

## Scope

Replace every image/thumbnail URL text input across all 10 content creation/editing forms, and the profile avatar field, with a `CoverImageInput` component that accepts either a file upload or a pasted URL. Uploaded files are optimised server-side (resize + compress + convert to WebP) before being stored in Supabase Storage.

---

## 1. Supabase Storage Buckets

Two new public buckets created via a new migration file (`supabase/migrations/YYYYMMDD_storage_buckets.sql`):

```sql
-- Create buckets
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('content-images', 'content-images', true),
  ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- content-images: authenticated users can upload to their own folder
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Authenticated users can update their content images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-images' AND (storage.foldername(name))[2] = auth.uid()::text);

CREATE POLICY "Public read for content images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'content-images');

-- avatars: authenticated users can upload/replace their own avatar
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

| Bucket | Path pattern | Purpose |
|--------|-------------|---------|
| `content-images` | `covers/{userId}/{uuid}.webp` | Article, video, podcast, pill, course cover images |
| `avatars` | `{userId}.webp` | User profile avatars (overwritten on each upload) |

---

## 2. Upload API Route

**`POST /api/upload`** — Next.js Route Handler (`app/api/upload/route.ts`)

**Request:** `multipart/form-data`
- `file: File` — the image to upload
- `type: 'cover' | 'avatar'`

**Auth:** reads session via `createClient()` from `@/lib/supabase/server`. Returns `401` if unauthenticated.

**Validation:**
- File must be an image MIME type (`image/*`)
- Max file size: 5 MB — return `413` if exceeded

**Sharp pipeline:**

| type | transform |
|------|-----------|
| `cover` | Resize to max 1200 px wide (preserve aspect ratio), WebP quality 80 |
| `avatar` | Resize + center-crop to 256 × 256 px, WebP quality 80 |

**Storage upload:** use `createServiceRoleClient()` from `@/lib/supabase/service-role` for the actual `storage.from(...).upload()` call (bypasses RLS for server-side uploads; auth is already verified above).

**Storage path:**
- `cover`: `covers/{userId}/{randomUUID()}.webp` in bucket `content-images`
- `avatar`: `{userId}.webp` in bucket `avatars` (upsert — overwrites previous)

**Response `200`:** `{ url: string }` — the Supabase Storage public URL
**Error responses:** `400` invalid file, `401` unauthenticated, `413` too large, `500` processing/upload failure

---

## 3. `CoverImageInput` Component

**File:** `components/ui/CoverImageInput.tsx`
**Directive:** `'use client'`

### Props

```ts
interface CoverImageInputProps {
  name: string                        // hidden input name (e.g. "cover_image_url")
  defaultValue?: string | null        // pre-existing URL (edit forms)
  uploadType?: 'cover' | 'avatar'     // default: 'cover'
  label?: string                      // field label; defaults to "Cover Image" / "Avatar"
  onChange?: (url: string) => void    // callback for forms that manage state directly (e.g. avatar)
}
```

### Internal state

```ts
const [url, setUrl] = useState(defaultValue ?? '')
const [uploading, setUploading] = useState(false)
const [error, setError] = useState<string | null>(null)
```

When `url` changes, call `onChange?.(url)` so that non-FormData callers (e.g. `CompleteProfileForm`) can track the value.

### Empty state (url is falsy)

- **Upload zone** — dashed border, click-to-open file picker, drag-and-drop
  - On file select: `POST /api/upload`, show loading spinner, on success call `setUrl(returnedUrl)`
  - On error: show inline error message
- **"or paste URL" divider**
- **URL input row** — text input + "Use URL" button
  - On "Use URL": validate it looks like a URL, call `setUrl(value)`

### Filled state (url is truthy)

- `cover` type: 16:9 image preview; hover overlay shows "↑ Replace" (rust gradient) and "✕ Remove" (ghost) buttons
- `avatar` type: 96 × 96 circular preview; same hover overlay

### Hidden input

Always renders `<input type="hidden" name={name} value={url} />` so the parent `<form>` submits the resolved URL to existing server actions unchanged.

### Error display

Inline below the widget: small red text. Cleared on next successful upload or URL entry.

---

## 4. Form Changes

The correct field names vary by content type:

| Form file | Current field name | FormData key to use |
|-----------|-------------------|---------------------|
| `app/[locale]/create/article/CreateArticleForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/create/podcast/CreatePodcastForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/create/course/CreateCourseForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/create/video/CreateVideoForm.tsx` | `thumbnail_url` | `thumbnail_url` |
| `app/[locale]/create/pill/CreatePillForm.tsx` | `image_url` | `image_url` |
| `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/dashboard/podcasts/[id]/edit/EditPodcastForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/dashboard/courses/[id]/edit/EditCourseForm.tsx` | `cover_image_url` | `cover_image_url` |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | `thumbnail_url` | `thumbnail_url` |
| `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` | `image_url` | `image_url` |

Each replacement:
```tsx
// Before
<Input id="cover_image_url" name="cover_image_url" type="url" defaultValue={initialCoverImageUrl} ... />

// After (use correct name per table above)
<CoverImageInput name="cover_image_url" defaultValue={initialCoverImageUrl} />
```

**Server actions are unchanged.** They already read the field names listed above as plain strings from `FormData`.

---

## 5. Profile Avatar

**File:** `components/auth/CompleteProfileForm.tsx`

`CompleteProfileForm` uses the Supabase browser client directly (no FormData / server action). Add avatar support by:

1. Add `avatarUrl` state: `const [avatarUrl, setAvatarUrl] = useState('')`
2. Include `<CoverImageInput name="avatar_url" uploadType="avatar" onChange={setAvatarUrl} />` in the form JSX
3. In `handleSubmit`, include `avatar_url: avatarUrl || null` in the `.update({...})` call to `profiles`

No new server action needed.

---

## 6. Dependencies

- `sharp` — add to `package.json` (not currently installed). Used only in the `/api/upload` route handler (server-side only).

No client-side image libraries needed.

---

## 7. Non-Goals

- Progress bar for uploads (spinner is sufficient)
- Multiple image uploads per content item
- Image cropping UI
- CDN integration (Supabase Storage public URLs are used directly)

---

## 8. Testing

**Unit (`tests/unit/`):**
- `POST /api/upload`: unauthenticated → 401, oversized file → 413, valid JPEG → `{ url }` with `.webp` path, avatar produces square 256×256 output

**Integration (Playwright):**
1. Creator uploads a JPEG cover on the article edit form — saved cover URL ends in `.webp`, image renders on article detail page
2. Creator pastes a URL — URL is accepted without upload, saves correctly
3. Creator uploads a profile avatar on complete-profile page — circular avatar appears
4. Unauthenticated `POST /api/upload` returns 401
