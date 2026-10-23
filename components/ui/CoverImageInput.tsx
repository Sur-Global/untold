'use client'

import { useState, useRef } from 'react'
import { Label } from '@/components/ui/label'

// Phone and camera photos are often 5–15 MB, over what the upload endpoint accepts (and over
// Vercel's ~4.5 MB request limit). Shrink big images in the browser before uploading; the
// server then converts them to WebP.
const MAX_DIMENSION = 2400
const SAFE_BYTES = 3 * 1024 * 1024

export async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size <= SAFE_BYTES) {
      bitmap.close()
      return file
    }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      bitmap.close()
      return file
    }
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    bitmap.close()
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88))
    if (!blob) return file
    return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
  } catch {
    // Format the browser can't decode (e.g. HEIC in Chrome): send as is, the server will say if it can't use it
    return file
  }
}

interface CoverImageInputProps {
  name: string
  defaultValue?: string | null
  uploadType?: 'cover' | 'avatar' | 'banner'
  label?: string
  /** shape of the preview box, e.g. '5/1' for a wide banner (default 16/9) */
  previewAspect?: string
  /** how the picture sits in the preview: cropped to fill (default) or shown whole */
  previewFit?: 'cover' | 'contain'
  /** replaces the default “best size” hint under the upload box */
  sizeHint?: string
  /** profile photos only: the person the photo belongs to (an editor may upload it for somebody else) */
  ownerId?: string
  onChange?: (url: string) => void
}

export function CoverImageInput({
  name,
  defaultValue,
  uploadType = 'cover',
  label,
  previewAspect = '16/9',
  previewFit = 'cover',
  sizeHint,
  ownerId,
  onChange,
}: CoverImageInputProps) {
  const [url, setUrl] = useState(defaultValue ?? '')
  const [urlInput, setUrlInput] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isAvatar = uploadType === 'avatar'
  const fieldLabel = label ?? (isAvatar ? 'Avatar' : 'Cover Image')

  async function handleFile(file: File) {
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', await prepareImage(file))
      fd.append('type', uploadType)
      if (ownerId && uploadType === 'avatar') fd.append('ownerId', ownerId)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(
          body.error ??
            (res.status === 413
              ? 'Image too large — try a smaller one (JPG or PNG).'
              : res.status === 401
                ? 'Your session expired — log in again and retry.'
                : `Upload failed (${res.status}). Try a JPG or PNG, or paste an image URL below.`),
        )
        return
      }
      const { url: uploadedUrl } = await res.json()
      setUrl(uploadedUrl)
      onChange?.(uploadedUrl)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  async function handleUseUrl() {
    const trimmed = urlInput.trim()
    try {
      new URL(trimmed)
    } catch {
      setError('Please enter a valid URL')
      return
    }
    setError(null)
    setUploading(true)
    try {
      // Re-host the image on our side (resized, never breaks). If that isn't possible,
      // keep the link as it is so the creator isn't blocked.
      const res = await fetch('/api/upload/from-url', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: trimmed, type: uploadType }),
      })
      if (res.ok) {
        const { url: hostedUrl } = await res.json()
        setUrl(hostedUrl)
        onChange?.(hostedUrl)
      } else {
        const body = await res.json().catch(() => ({}))
        setUrl(trimmed)
        onChange?.(trimmed)
        setError(`${body.error ?? 'Could not import that image'} — the link was kept as is, check that the picture shows up.`)
      }
    } catch {
      setUrl(trimmed)
      onChange?.(trimmed)
    } finally {
      setUploading(false)
      setUrlInput('')
    }
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
                : { aspectRatio: previewAspect }),
              background: '#2c2420',
            }}
            className="group"
          >
            <img src={url} alt={fieldLabel} style={{ width: '100%', height: '100%', objectFit: previewFit, display: 'block' }} />
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
                onClick={() => { setUrl(''); onChange?.('') }}
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
                  JPEG · PNG · WebP · large photos are resized automatically
                  {!isAvatar && <><br />{sizeHint ?? 'Best: horizontal 16:9 (e.g. 1600×900) so nothing gets cropped'}</>}
                </div>
              </>
            )}
          </div>
          {/* Profile photos are upload-only (resized and hosted by us); covers may also be pasted as a link */}
          {!isAvatar && (
            <>
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
              className="h-10 flex-1 rounded-[10px] border border-primary/20 bg-white px-3 text-sm text-foreground outline-none transition-colors focus:border-primary/50 placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleUseUrl}
              style={{ background: '#E8E2D5', border: '1px solid rgba(139,69,19,0.2)', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontFamily: 'JetBrains Mono, monospace', color: '#6B5F58', cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              Use URL
            </button>
          </div>
            </>
          )}
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
