'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createVideo } from '@/lib/actions/video'
import type { VideoMetadata } from '@/app/api/video-metadata/route'

async function fetchVideoMetadata(url: string): Promise<VideoMetadata | null> {
  try {
    const res = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export function CreateVideoForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const [embedUrl, setEmbedUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)

  const handleExtract = async () => {
    if (!embedUrl.trim()) return
    setExtracting(true)
    const meta = await fetchVideoMetadata(embedUrl)
    setExtracting(false)
    if (!meta) return
    if (meta.title) setTitle(meta.title)
    if (meta.thumbnailUrl) setThumbnailUrl(meta.thumbnailUrl)
    if (meta.duration) setDuration(meta.duration)
    setExtracted(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    // Inject extracted values that aren't standard form fields
    fd.set('embed_url', embedUrl)
    fd.set('thumbnail_url', thumbnailUrl)
    fd.set('duration', duration)
    startTransition(() => createVideo(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {/* Step 1: Paste video URL */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          {t('videoUrlLabel')}
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={embedUrl}
            onChange={(e) => { setEmbedUrl(e.target.value); setExtracted(false) }}
            onBlur={handleExtract}
            placeholder={t('videoUrlPlaceholder')}
            required
            className="flex-1 h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={handleExtract}
            disabled={extracting || !embedUrl.trim()}
            className="h-[50px] px-4 rounded-[10px] border border-primary/20 text-sm font-['JetBrains_Mono',monospace] tracking-[0.28px] text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {extracting ? t('videoUrlExtracting') : t('videoUrlExtract')}
          </button>
        </div>
        {extracted && (
          <p className="text-xs text-green-600 font-['JetBrains_Mono',monospace]">✓ Info extracted — review below</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          Video Title <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('titlePlaceholder')}
          required
          className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
        />
      </div>

      {/* Thumbnail preview (if extracted) */}
      {thumbnailUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">Thumbnail</label>
          <div className="rounded-[10px] overflow-hidden border border-primary/20 aspect-video max-w-xs bg-gray-50">
            <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !embedUrl.trim() || !title.trim()}
        className="w-full h-[54px] rounded-[16px] gradient-rust text-white text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] transition-opacity disabled:opacity-60"
      >
        {isPending ? td('saving') : td('saveAsDraft')}
      </button>
    </form>
  )
}
