'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createVideo } from '@/lib/actions/video'
import type { VideoChapter, VideoMetadata } from '@/app/api/video-metadata/route'
import { RichTextEditor } from '@/components/editor/RichTextEditorLazy'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'
import { FeatureRequestField } from '@/components/content/FeatureRequestField'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'

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
  const locale = useLocale()
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)
  // Mirrors publishRef for rendering (refs can't be read during render)
  const [publishing, setPublishing] = useState(false)
  const [declared, setDeclared] = useState(false)

  const [embedUrl, setEmbedUrl] = useState('')
  const [title, setTitle] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [duration, setDuration] = useState('')
  const [body, setBody] = useState<EditorBlock[] | null>(null)
  // Bumped when the description is filled from the video, so the editor remounts with it
  const [bodyKey, setBodyKey] = useState(0)
  const [tags, setTags] = useState<Tag[]>([])
  const [chapters, setChapters] = useState<VideoChapter[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extracted, setExtracted] = useState(false)

  const handleExtract = async () => {
    if (!embedUrl.trim()) return
    setExtracting(true)
    const meta = await fetchVideoMetadata(embedUrl)
    setExtracting(false)
    if (!meta) return
    if (meta.title) setTitle(meta.title)
    // Fill the description from the video's, unless one was already written
    if (meta.description && !body?.length) {
      const blocks = meta.description
        .split(/\n\n+/)
        .map((text) => text.trim())
        .filter(Boolean)
        .map((text) => ({
          id: crypto.randomUUID(),
          type: 'paragraph',
          props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
          content: [{ type: 'text', text, styles: {} }],
          children: [],
        })) as EditorBlock[]
      if (blocks.length > 0) {
        setBody(blocks)
        setBodyKey((k) => k + 1)
      }
    }
    if (meta.thumbnailUrl) setThumbnailUrl(meta.thumbnailUrl)
    if (meta.duration) setDuration(meta.duration)
    if (meta.chapters?.length) setChapters(meta.chapters)
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
    if (body) fd.set('body', JSON.stringify(body))
    fd.set('tag_ids', JSON.stringify(tags.map((tag) => tag.id)))
    fd.set('chapters', JSON.stringify(chapters))
    fd.set('publish', String(publishRef.current))
    startTransition(() => createVideo(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />
      <LanguageAvailabilityFields showSubtitles />

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
          <p className="text-xs text-green-800 font-['JetBrains_Mono',monospace]">{t('infoExtractedMessage')}</p>
        )}
      </div>

      {/* Title */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">
          {t('videoTitleLabel')} <span className="text-red-500">*</span>
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

      {/* Description */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">{t('descriptionLabel')}</label>
        <div className="rounded-[10px] border border-primary/20 overflow-hidden">
          <RichTextEditor key={bodyKey} value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-foreground">{t('topicCategoryLabel')}</label>
        <TagsInput value={tags} onChange={setTags} placeholder={t('topicCategoryPlaceholder')} />
      </div>

      {/* Thumbnail preview (if extracted) */}
      {thumbnailUrl && (
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('thumbnailLabel')}</label>
          <div className="rounded-[10px] overflow-hidden border border-primary/20 aspect-video max-w-xs bg-gray-50">
            <img src={thumbnailUrl} alt="Video thumbnail" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      <FeatureRequestField />

      <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />

      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isPending || !embedUrl.trim() || !title.trim()}
          onClick={() => { publishRef.current = false; setPublishing(false) }}
          className="flex-1 h-[54px] rounded-[16px] border border-primary/30 text-primary text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] hover:bg-primary/5 transition-colors disabled:opacity-60"
        >
          {isPending && !publishing ? td('saving') : td('saveAsDraft')}
        </button>
        <button
          type="submit"
          disabled={isPending || !declared || !embedUrl.trim() || !title.trim()}
          onClick={() => { publishRef.current = true; setPublishing(true) }}
          className="flex-1 h-[54px] rounded-[16px] gradient-rust text-white text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] transition-opacity disabled:opacity-60"
        >
          {isPending && publishing ? td('saving') : td('publish')}
        </button>
      </div>
    </form>
  )
}
