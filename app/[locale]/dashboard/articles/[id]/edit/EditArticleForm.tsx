'use client'

import { useRef, useState, useTransition, useCallback, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { updateArticle, publishArticle, unpublishArticle, deleteArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { Link } from '@/i18n/navigation'

interface EditArticleFormProps {
  id: string
  status: string
  initialTitle: string
  initialExcerpt: string
  initialFeaturedSummary: string
  initialCoverImageUrl: string
  initialImageCredits: string
  initialBody: import('@blocknote/core').Block[] | null
  initialTags: Tag[]
  initialFeatureRequested: boolean
  authorName: string
  authorRole?: string
  authorBio?: string
}

export function EditArticleForm({
  id,
  status,
  initialTitle,
  initialExcerpt,
  initialFeaturedSummary,
  initialCoverImageUrl,
  initialImageCredits,
  initialBody,
  initialTags,
  initialFeatureRequested,
  authorName,
  authorRole,
  authorBio,
}: EditArticleFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')

  const [title, setTitle] = useState(initialTitle)
  const [excerpt, setExcerpt] = useState(initialExcerpt)
  const [featuredSummary, setFeaturedSummary] = useState(initialFeaturedSummary)
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl)
  const [imageCredits, setImageCredits] = useState(initialImageCredits)
  const [body, setBody] = useState<import('@blocknote/core').Block[] | null>(initialBody)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [featureRequested, setFeatureRequested] = useState(initialFeatureRequested)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [activeTab, setActiveTab] = useState<'text' | 'images'>('text')
  const [isPending, startTransition] = useTransition()

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  // Keep a ref to the latest save payload so the debounce always uses fresh values
  const latestState = useRef({ title, excerpt, featuredSummary, coverImageUrl, imageCredits, body, tags, featureRequested })
  latestState.current = { title, excerpt, featuredSummary, coverImageUrl, imageCredits, body, tags, featureRequested }

  const doSave = useCallback(() => {
    const s = latestState.current
    if (!s.title.trim()) return
    const fd = new FormData()
    fd.set('title', s.title)
    fd.set('excerpt', s.excerpt)
    fd.set('featured_summary', s.featuredSummary)
    fd.set('cover_image_url', s.coverImageUrl)
    fd.set('image_credits', s.imageCredits)
    fd.set('tag_ids', JSON.stringify(s.tags.map((t) => t.id)))
    fd.set('feature_requested', String(s.featureRequested))
    if (s.body) fd.set('body', JSON.stringify(s.body))
    setSaveStatus('saving')
    startTransition(async () => {
      await updateArticle(id, fd)
      setSaveStatus('saved')
    })
  }, [id])

  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(doSave, 2000)
  }, [doSave])

  // Trigger auto-save when any field changes
  useEffect(() => { triggerAutoSave() }, [title, excerpt, featuredSummary, coverImageUrl, imageCredits, tags, featureRequested]) // eslint-disable-line react-hooks/exhaustive-deps
  const handleBodyChange = useCallback((blocks: import('@blocknote/core').Block[]) => {
    setBody(blocks)
    triggerAutoSave()
  }, [triggerAutoSave])

  const tabs = [
    { id: 'text', label: 'Text' },
    { id: 'images', label: 'Images' },
  ] as const

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/articles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground font-['JetBrains_Mono',monospace] tracking-[0.28px] mb-6 hover:text-primary transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('backToDashboard')}
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-['Audiowide'] text-foreground uppercase text-2xl mb-1">
              Edit Article
            </h1>
            <p className="text-sm text-muted-foreground">Edit text, layout, and images for your article</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            {/* Save status indicator */}
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
              'flex-1 h-[44px] rounded-[10px] text-sm font-["JetBrains_Mono",monospace] tracking-[0.28px] transition-colors',
              activeTab === tab.id
                ? 'bg-primary text-white'
                : 'text-muted-foreground hover:bg-primary/5',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main form card */}
      <div className="bg-card border border-primary/20 rounded-2xl shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] p-8 space-y-6">

        {activeTab === 'text' && (
          <>
            {/* Article Title */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Article Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('titlePlaceholder')}
                required
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {/* Subtitle (Excerpt) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Subtitle</label>
              <input
                type="text"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="How communities are reclaiming their spaces"
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            {/* Topic/Category (Tags) */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Topic / Category</label>
              <TagsInput value={tags} onChange={setTags} placeholder="Urban Planning, Human Rights…" />
            </div>

            {/* Featured Summary */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Featured Summary</label>
              <p className="text-xs text-muted-foreground -mt-1">Shown publicly only when this article is featured</p>
              <textarea
                value={featuredSummary}
                onChange={(e) => setFeaturedSummary(e.target.value)}
                placeholder="Urban regeneration is not just about new buildings…"
                rows={4}
                className="w-full px-4 py-3 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
              />
            </div>

            {/* Full Content */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Full Content</label>
              <div className="rounded-[10px] border border-primary/20 overflow-hidden">
                <RichTextEditor
                  value={body}
                  onChange={handleBodyChange}
                  placeholder={t('bodyPlaceholder')}
                />
              </div>
            </div>

            {/* Author info (read-only) */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Author Name</label>
                <div className="h-[50px] px-4 flex items-center rounded-[10px] border border-primary/10 bg-primary/5 text-foreground text-base">
                  {authorName}
                </div>
              </div>
              {authorRole && (
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-foreground">Author Role</label>
                  <div className="h-[50px] px-4 flex items-center rounded-[10px] border border-primary/10 bg-primary/5 text-muted-foreground text-base">
                    {authorRole}
                  </div>
                </div>
              )}
            </div>

            {/* Featured content submission */}
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
                  className="mt-1 w-4 h-4 rounded accent-[#b8860b]"
                />
                <div>
                  <p className="font-semibold text-[#5d4e37] mb-1">✨ Submit for featured content at UNTOLD.ink</p>
                  <p className="text-sm text-[#6b5744] leading-relaxed">
                    Your content will be published immediately on your personal UNTOLD page. If approved by an Editor,
                    it could become featured content with higher visibility on the homepage and in searches.
                  </p>
                </div>
              </label>
            </div>
          </>
        )}

        {activeTab === 'images' && (
          <div className="space-y-6">
            <CoverImageInput
              name="cover_image_url"
              defaultValue={coverImageUrl}
              onChange={setCoverImageUrl}
            />
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Cover image credit</label>
              <input
                type="text"
                value={imageCredits}
                onChange={(e) => setImageCredits(e.target.value)}
                placeholder="e.g. Chris Lawton on Unsplash"
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-4 mt-6">
        {/* Save Changes */}
        <button
          type="button"
          onClick={doSave}
          disabled={isPending || !title.trim()}
          className="flex-1 h-[54px] rounded-[16px] text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(175.88deg, #8b4513 0%, #a0522d 100%)' }}
        >
          {isPending ? td('saving') : td('saveChanges')}
        </button>

        {/* Publish / Unpublish */}
        {status === 'draft' ? (
          <button
            type="button"
            onClick={() => startTransition(() => publishArticle(id, new FormData()))}
            disabled={isPending}
            className="h-[54px] px-6 rounded-[16px] border border-primary/30 text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {td('publish')}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => startTransition(() => unpublishArticle(id, new FormData()))}
            disabled={isPending}
            className="h-[54px] px-6 rounded-[16px] border border-primary/30 text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] text-primary hover:bg-primary/5 transition-colors disabled:opacity-50"
          >
            {td('unpublish')}
          </button>
        )}

        {/* Delete */}
        <button
          type="button"
          onClick={() => {
            if (confirm(td('deleteConfirm'))) startTransition(() => deleteArticle(id))
          }}
          disabled={isPending}
          className="h-[54px] px-4 rounded-[16px] text-sm font-['JetBrains_Mono',monospace] text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label="Delete article"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
