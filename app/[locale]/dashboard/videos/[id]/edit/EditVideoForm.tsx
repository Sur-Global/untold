'use client'

import { useRef, useState, useTransition, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
import { updateVideo } from '@/lib/actions/video'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { ensureTag } from '@/lib/actions/tags'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { Link } from '@/i18n/navigation'
import type { VideoMetadata, VideoChapter as Chapter } from '@/app/api/video-metadata/route'
import type { TranscriptCue } from '@/lib/transcript'
type LayoutStyle = 'standard' | 'wide' | 'sidebar' | 'card'

interface EditVideoFormProps {
  id: string
  status: string
  initialTitle: string
  initialBody: EditorBlock[] | null
  initialEmbedUrl: string
  initialThumbnailUrl: string
  initialDuration: string
  initialChapters: Chapter[]
  initialLayoutStyle: LayoutStyle
  initialTranscript: TranscriptCue[] | null
  initialTags: Tag[]
  initialFeatureRequested: boolean
}

async function fetchVideoMetadata(url: string): Promise<VideoMetadata | null> {
  try {
    const res = await fetch(`/api/video-metadata?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

const LAYOUTS: { id: LayoutStyle; icon: React.ReactNode }[] = [
  {
    id: 'standard',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="8" y="8" width="32" height="6" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="8" y="18" width="32" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="8" y="36" width="32" height="4" rx="2" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'wide',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="4" y="8" width="40" height="6" rx="2" fill="currentColor" opacity="0.3" />
        <rect x="4" y="18" width="40" height="14" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="4" y="36" width="40" height="4" rx="2" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'sidebar',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="8" y="8" width="20" height="32" rx="2" fill="currentColor" opacity="0.15" />
        <rect x="32" y="8" width="8" height="14" rx="2" fill="currentColor" opacity="0.25" />
        <rect x="32" y="26" width="8" height="14" rx="2" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
  {
    id: 'card',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden>
        <rect x="8" y="8" width="14" height="14" rx="2" fill="currentColor" opacity="0.2" />
        <rect x="26" y="8" width="14" height="14" rx="2" fill="currentColor" opacity="0.2" />
        <rect x="8" y="26" width="14" height="14" rx="2" fill="currentColor" opacity="0.2" />
        <rect x="26" y="26" width="14" height="14" rx="2" fill="currentColor" opacity="0.2" />
      </svg>
    ),
  },
]

const LAYOUT_LABELS: Record<LayoutStyle, { label: string; desc: string }> = {
  standard: { label: 'Standard', desc: 'Classic single-column layout' },
  wide: { label: 'Wide', desc: 'Wide layout for more space' },
  sidebar: { label: 'Sidebar', desc: 'Content with side panel' },
  card: { label: 'Card', desc: 'Compact card-style layout' },
}

export function EditVideoForm({
  id,
  status,
  initialTitle,
  initialBody,
  initialEmbedUrl,
  initialThumbnailUrl,
  initialDuration,
  initialChapters,
  initialLayoutStyle,
  initialTranscript,
  initialTags,
  initialFeatureRequested,
}: EditVideoFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const locale = useLocale()

  const [activeTab, setActiveTab] = useState<'text' | 'layout' | 'images'>('text')
  const [embedUrl, setEmbedUrl] = useState(initialEmbedUrl)
  const [title, setTitle] = useState(initialTitle)
  const [body, setBody] = useState<EditorBlock[] | null>(initialBody)
  const [duration, setDuration] = useState(initialDuration)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [chapters, setChapters] = useState<Chapter[]>(
    initialChapters.length > 0 ? initialChapters : [{ timestamp: '', title: '' }]
  )
  const [featureRequested, setFeatureRequested] = useState(initialFeatureRequested)
  const [layoutStyle, setLayoutStyle] = useState<LayoutStyle>(initialLayoutStyle)
  const [transcript, setTranscript] = useState<TranscriptCue[] | null>(initialTranscript)
  const [thumbnailUrl, setThumbnailUrl] = useState(initialThumbnailUrl)
  const [extracting, setExtracting] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [isPending, startTransition] = useTransition()

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const latestState = useRef({
    embedUrl, title, body, duration, tags, chapters,
    featureRequested, layoutStyle, transcript, thumbnailUrl,
  })
  latestState.current = {
    embedUrl, title, body, duration, tags, chapters,
    featureRequested, layoutStyle, transcript, thumbnailUrl,
  }

  const doSave = useCallback(() => {
    const s = latestState.current
    if (!s.title.trim()) return
    const fd = new FormData()
    fd.set('title', s.title)
    if (s.body) fd.set('body', JSON.stringify(s.body))
    fd.set('embed_url', s.embedUrl)
    fd.set('thumbnail_url', s.thumbnailUrl)
    fd.set('duration', s.duration)
    fd.set('tag_ids', JSON.stringify(s.tags.map((t) => t.id)))
    fd.set('chapters', JSON.stringify(s.chapters.filter((c) => c.timestamp || c.title)))
    fd.set('feature_requested', String(s.featureRequested))
    fd.set('layout_style', s.layoutStyle)
    if (s.transcript) fd.set('transcript', JSON.stringify(s.transcript))
    setSaveStatus('saving')
    startTransition(async () => {
      await updateVideo(id, fd)
      setSaveStatus('saved')
    })
  }, [id])

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(doSave, 2000)
  }, [doSave])

  useEffect(() => {
    triggerAutoSave()
  }, [title, embedUrl, duration, tags, chapters, featureRequested, layoutStyle, thumbnailUrl]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBodyChange = useCallback((blocks: EditorBlock[]) => {
    setBody(blocks)
    triggerAutoSave()
  }, [triggerAutoSave])

  const handleExtract = async () => {
    if (!embedUrl.trim()) return
    setExtracting(true)
    const meta = await fetchVideoMetadata(embedUrl)
    setExtracting(false)
    if (!meta) return
    if (meta.title) setTitle(meta.title)
    if (meta.description) {
      // Convert plain text description to BlockNote paragraph blocks
      const blocks: EditorBlock[] = meta.description
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
        triggerAutoSave()
      }
    }
    if (meta.thumbnailUrl) setThumbnailUrl(meta.thumbnailUrl)
    if (meta.duration) setDuration(meta.duration)
    if (meta.tags?.length && tags.length === 0) {
      const resolved = await Promise.all(meta.tags.map((name) => ensureTag(name)))
      setTags(resolved)
    }
    if (meta.chapters?.length) {
      setChapters(meta.chapters)
    }
    if (meta.transcript?.length) {
      setTranscript(meta.transcript)
      triggerAutoSave()
    }
  }

  const addChapter = () => setChapters((c) => [...c, { timestamp: '', title: '' }])
  const removeChapter = (i: number) => setChapters((c) => c.filter((_, idx) => idx !== i))
  const updateChapter = (i: number, field: keyof Chapter, value: string) => {
    setChapters((c) => c.map((ch, idx) => idx === i ? { ...ch, [field]: value } : ch))
  }

  const tabs = [
    { id: 'text' as const, label: 'Text' },
    { id: 'layout' as const, label: 'Layout' },
    { id: 'images' as const, label: 'Images' },
  ]

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-['JetBrains_Mono',monospace] tracking-[0.28px] mb-6 hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('backToDashboard')}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-['Audiowide'] text-foreground uppercase text-2xl mb-1">Edit Video</h1>
            <p className="text-sm text-muted-foreground">Edit text, layout, and images for your video</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <span className="text-xs font-['JetBrains_Mono',monospace] text-muted-foreground">
              {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'unsaved' ? 'Unsaved' : '✓ Saved'}
            </span>
            <span
              className="text-xs font-['JetBrains_Mono',monospace] px-2.5 py-0.5 rounded-full"
              style={{
                background: status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
                color: status === 'published' ? '#16a34a' : '#A0522D',
              }}
            >
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-card flex gap-2 p-2 rounded-[16px] mb-6 border border-primary/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 h-[44px] rounded-[10px] text-sm font-[\'JetBrains_Mono\',monospace] tracking-[0.28px] transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-primary/5',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Form card */}
      <div className="bg-card border border-primary/20 rounded-2xl shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] p-8 space-y-6">

        {/* ── Text tab ── */}
        {activeTab === 'text' && (
          <>
            {/* Video URL */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">{t('videoUrlLabel')}</label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={embedUrl}
                  onChange={(e) => setEmbedUrl(e.target.value)}
                  onBlur={handleExtract}
                  placeholder={t('videoUrlPlaceholder')}
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
            </div>

            {/* Transcript status */}
            {transcript !== null && (
              <p className="text-xs font-['JetBrains_Mono',monospace] text-primary/70">
                {transcript.length > 0
                  ? `✓ Transcript extracted (${transcript.length} cues)`
                  : 'No transcript available for this video'}
              </p>
            )}

            {/* Video Title */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Description</label>
              <RichTextEditor value={body} onChange={handleBodyChange} locale={locale} />
            </div>

            {/* Duration + Topic */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Duration</label>
                <input
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder={t('durationPlaceholder')}
                  className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Topic / Category</label>
                <TagsInput value={tags} onChange={setTags} placeholder="Urban Design, Climate…" />
              </div>
            </div>

            {/* Video Chapters */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-foreground">Video Chapters</label>
              {chapters.map((ch, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={ch.timestamp}
                    onChange={(e) => updateChapter(i, 'timestamp', e.target.value)}
                    placeholder="0:00"
                    className="w-24 h-[42px] px-3 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground font-['JetBrains_Mono',monospace] text-sm"
                  />
                  <input
                    type="text"
                    value={ch.title}
                    onChange={(e) => updateChapter(i, 'title', e.target.value)}
                    placeholder="Chapter title"
                    className="flex-1 h-[42px] px-3 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => removeChapter(i)}
                    className="w-9 h-[42px] flex items-center justify-center rounded-[10px] text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    aria-label="Remove chapter"
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M2 4h12M5 4V2.5a.5.5 0 01.5-.5h5a.5.5 0 01.5.5V4M13 4l-.88 8.79A1 1 0 0111.13 14H4.87a1 1 0 01-.99-.88L3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addChapter}
                className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] border border-primary/20 text-sm font-['JetBrains_Mono',monospace] tracking-[0.28px] text-primary hover:bg-primary/5 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Add Chapter
              </button>
            </div>

            {/* Featured content */}
            <div
              className="rounded-[16px] p-6 border-2"
              style={{
                background: '#fff9f0',
                borderColor: '#b8860b',
                boxShadow: '0px 2px 8px 0px rgba(184,134,11,0.1)',
              }}
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={featureRequested}
                  onChange={(e) => setFeatureRequested(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-[#b8860b] cursor-pointer"
                />
                <div>
                  <p className="font-semibold text-[#5d4e37] text-base leading-snug mb-1">
                    ✨ Submit for featured content at UNTOLD.ink
                  </p>
                  <p className="text-sm text-[#6b5744] leading-[1.6]">
                    Your content will be published immediately on your personal UNTOLD page. If approved by an Editor, it could become featured content with higher visibility on the homepage and in searches.
                  </p>
                </div>
              </label>
            </div>
          </>
        )}

        {/* ── Layout tab ── */}
        {activeTab === 'layout' && (
          <>
            <p className="text-sm text-muted-foreground">Select the layout style for this content</p>

            <div className="grid grid-cols-2 gap-4">
              {LAYOUTS.map((layout) => {
                const { label, desc } = LAYOUT_LABELS[layout.id]
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setLayoutStyle(layout.id)}
                    className={[
                      'flex flex-col gap-4 p-6 rounded-[16px] border-2 text-left transition-all',
                      layoutStyle === layout.id
                        ? 'border-primary bg-white'
                        : 'border-primary/20 bg-white hover:border-primary/40',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-center rounded-[10px] bg-gradient-to-br from-gray-100 to-gray-200 h-[128px] w-full text-primary">
                      {layout.icon}
                    </div>
                    <div>
                      <p className="font-['Audiowide'] text-foreground text-base uppercase mb-1">{label}</p>
                      <p className="text-sm font-['JetBrains_Mono',monospace] text-muted-foreground tracking-[0.28px]">{desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

          </>
        )}

        {/* ── Images tab ── */}
        {activeTab === 'images' && (
          <CoverImageInput
            key={thumbnailUrl}
            name="thumbnail_url"
            defaultValue={thumbnailUrl}
            onChange={setThumbnailUrl}
            label="Video Thumbnail"
          />
        )}
      </div>

      {/* Action bar */}
      <div className="flex gap-4 mt-6">
        <button
          type="button"
          onClick={doSave}
          disabled={isPending}
          className="flex-1 h-[54px] rounded-[16px] gradient-rust text-white text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M16 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7l-1-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13 3v4H7V3M7 11h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isPending ? td('saving') : td('saveChanges')}
        </button>

        {status === 'draft' ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => publishContent(id, new FormData()))}
            className="h-[54px] px-6 rounded-[16px] border border-primary/30 text-primary text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            {td('publish')}
          </button>
        ) : (
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}
            className="h-[54px] px-6 rounded-[16px] border border-primary/30 text-primary text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] hover:bg-primary/5 transition-colors disabled:opacity-60"
          >
            {td('unpublish')}
          </button>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id))
          }}
          className="h-[54px] px-4 rounded-[16px] text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-['JetBrains_Mono',monospace] tracking-[0.28px] transition-colors disabled:opacity-60 ml-auto"
        >
          {td('deleteContent')}
        </button>
      </div>
    </div>
  )
}
