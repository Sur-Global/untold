'use client'

import { useState, useRef } from 'react'
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
      onChange?.(uploadedUrl)
    } catch {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  function handleUseUrl() {
    const trimmed = urlInput.trim()
    try {
      new URL(trimmed)
    } catch {
      setError('Please enter a valid URL')
      return
    }
    setError(null)
    setUrl(trimmed)
    onChange?.(trimmed)
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
