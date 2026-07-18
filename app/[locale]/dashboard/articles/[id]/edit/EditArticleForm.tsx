'use client'

import { useRef, useState, useTransition, useCallback, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
import { updateArticle, publishArticle, unpublishArticle, deleteArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { PhotoCreditInput } from '@/components/content/PhotoCreditInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { Link } from '@/i18n/navigation'

interface LocaleData {
  locale: string
  title: string
  excerpt: string
  featuredSummary: string
  body: EditorBlock[] | null
  bodyHtml: string | null
  isAutoTranslated: boolean | null
}

interface EditArticleFormProps {
  id: string
  status: string
  sourceLocale: string
  translations: LocaleData[]
  availableLocales: string[]
  initialCoverImageUrl: string
  initialImageCredits: string
  initialTags: Tag[]
  initialFeatureRequested: boolean
  authorName: string
  authorRole?: string
  authorBio?: string
}

const LOCALE_LABELS: Record<string, string> = {
  en: 'EN',
  es: 'ES',
  pt: 'PT',
  fr: 'FR',
  de: 'DE',
  da: 'DA',
}

export function EditArticleForm({
  id,
  status,
  sourceLocale,
  translations,
  availableLocales,
  initialCoverImageUrl,
  initialImageCredits,
  initialTags,
  initialFeatureRequested,
  authorName,
  authorRole,
  authorBio: _authorBio,
}: EditArticleFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const uiLocale = useLocale()

  // Per-locale text state, initialised from server-fetched translations
  const [localeStates, setLocaleStates] = useState<Record<string, {
    title: string
    excerpt: string
    featuredSummary: string
    body: EditorBlock[] | null
    bodyHtml: string | null
  }>>(() => {
    const init: Record<string, any> = {}
    for (const tr of translations) {
      init[tr.locale] = {
        title: tr.title,
        excerpt: tr.excerpt,
        featuredSummary: tr.featuredSummary,
        body: tr.body,
        bodyHtml: tr.bodyHtml,
      }
    }
    if (!init[sourceLocale]) {
      init[sourceLocale] = { title: '', excerpt: '', featuredSummary: '', body: null, bodyHtml: null }
    }
    return init
  })

  const [activeLocale, setActiveLocale] = useState(sourceLocale)

  // Global (non-locale-specific) state
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl)
  const [imageCredits, setImageCredits] = useState(initialImageCredits)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [featureRequested, setFeatureRequested] = useState(initialFeatureRequested)
  // Not persisted — must be re-confirmed before every publish action, not just once ever.
  const [publishConfirmed, setPublishConfirmed] = useState(false)

  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Ref always holds the latest state so the debounced save closure captures fresh values
  const latestRef = useRef({
    activeLocale,
    localeStates,
    coverImageUrl,
    imageCredits,
    tags,
    featureRequested,
  })
  latestRef.current = { activeLocale, localeStates, coverImageUrl, imageCredits, tags, featureRequested }

  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const skipAutoSave = useRef(false)
  // Guards against out-of-order network responses: if a save is already in flight and
  // another one is requested (e.g. the user kept typing), queue it instead of firing a
  // second concurrent request — an older, slower request finishing last could otherwise
  // overwrite newer edits.
  const isSavingRef = useRef(false)
  const pendingSaveRef = useRef(false)

  const doSave = useCallback(() => {
    if (isSavingRef.current) {
      pendingSaveRef.current = true
      return
    }
    const { activeLocale: al, localeStates: ls, coverImageUrl: cu, imageCredits: ic, tags: tg, featureRequested: fr } = latestRef.current
    const s = ls[al] ?? { title: '', excerpt: '', featuredSummary: '', body: null }
    if (!s.title.trim()) return
    const fd = new FormData()
    fd.set('edit_locale', al)
    fd.set('title', s.title)
    fd.set('excerpt', s.excerpt)
    fd.set('featured_summary', s.featuredSummary)
    fd.set('cover_image_url', cu)
    fd.set('image_credits', ic)
    fd.set('tag_ids', JSON.stringify(tg.map((tag) => tag.id)))
    fd.set('feature_requested', String(fr))
    if (s.body) fd.set('body', JSON.stringify(s.body))
    isSavingRef.current = true
    setSaveStatus('saving')
    setSaveError(null)
    startTransition(async () => {
      try {
        await updateArticle(id, fd)
        setSaveStatus('saved')
      } catch (err) {
        setSaveStatus('unsaved')
        setSaveError(err instanceof Error ? err.message : 'Save failed')
      } finally {
        isSavingRef.current = false
        if (pendingSaveRef.current) {
          pendingSaveRef.current = false
          doSave()
        }
      }
    })
  }, [id])

  const triggerAutoSave = useCallback(() => {
    if (skipAutoSave.current) {
      skipAutoSave.current = false
      return
    }
    setSaveStatus('unsaved')
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(doSave, 2000)
  }, [doSave])

  // Watch active locale's text fields for auto-save
  const als = localeStates[activeLocale] ?? { title: '', excerpt: '', featuredSummary: '', body: null, bodyHtml: null }
  // useEffect always fires once after the initial mount regardless of whether these values
  // "changed" — without this guard, simply opening the edit page schedules a save 2s later,
  // which (for legacy Tiptap articles) captures the body mid-conversion to BlockNote format
  // and silently rewrites/invalidates content nobody touched.
  const hasMountedRef = useRef(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return }
    triggerAutoSave()
  }, [als.title, als.excerpt, als.featuredSummary, coverImageUrl, imageCredits, tags, featureRequested])

  const handleBodyChange = useCallback((blocks: EditorBlock[], opts?: { silent?: boolean }) => {
    setLocaleStates(prev => ({
      ...prev,
      [latestRef.current.activeLocale]: { ...prev[latestRef.current.activeLocale], body: blocks },
    }))
    // Programmatic updates (initial legacy-HTML conversion, locale-switch sync)
    // shouldn't trigger an autosave — only genuine user edits should.
    if (!opts?.silent) triggerAutoSave()
  }, [triggerAutoSave])

  const setLocaleField = useCallback((field: 'title' | 'excerpt' | 'featuredSummary', value: string) => {
    setLocaleStates(prev => ({
      ...prev,
      [latestRef.current.activeLocale]: { ...prev[latestRef.current.activeLocale], [field]: value },
    }))
  }, [])

  const switchLocale = useCallback((newLocale: string) => {
    if (newLocale === latestRef.current.activeLocale) return
    // Save current locale before switching
    doSave()
    // Suppress the auto-save that fires when activeLocaleState reference changes
    skipAutoSave.current = true
    setActiveLocale(newLocale)
  }, [doSave])

  // Sorted locale tabs: source first, then others in supported order
  const availableLocalesWithData = new Set(translations.map(tr => tr.locale))
  availableLocalesWithData.add(sourceLocale)
  const localeTabs = availableLocales.filter(l => availableLocalesWithData.has(l))

  const activeTitle = als.title

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
            <h1 className="font-heading text-foreground text-2xl mb-1">{t('editArticleTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('editArticleSubtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 mt-1">
            <span className="text-xs font-['JetBrains_Mono',monospace] text-muted-foreground">
              {saveStatus === 'saving' ? td('saving') : saveStatus === 'unsaved' ? td('unsavedStatus') : td('savedStatus')}
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
        {saveError && (
          <p className="mt-2 rounded-[10px] bg-destructive/10 px-4 py-2 text-sm text-destructive">
            {saveError}
          </p>
        )}
      </div>

      {/* Language tabs — shown when there's more than one locale */}
      {localeTabs.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {localeTabs.map((loc) => {
            const trData = translations.find(tr => tr.locale === loc)
            const isSource = loc === sourceLocale
            const isActive = loc === activeLocale
            const hasContent = !!(localeStates[loc]?.title)
            return (
              <button
                key={loc}
                type="button"
                onClick={() => switchLocale(loc)}
                className={[
                  'inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-["JetBrains_Mono",monospace] tracking-wider transition-colors border',
                  isActive
                    ? 'bg-primary text-white border-primary'
                    : 'bg-card text-muted-foreground border-primary/20 hover:border-primary/50 hover:text-foreground',
                ].join(' ')}
              >
                {LOCALE_LABELS[loc] ?? loc.toUpperCase()}
                {isSource && (
                  <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-muted-foreground'}`}>
                    src
                  </span>
                )}
                {!isSource && trData?.isAutoTranslated === false && (
                  <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-blue-500'}`}>✓</span>
                )}
                {!isSource && trData?.isAutoTranslated === true && hasContent && (
                  <span className={`text-[10px] ${isActive ? 'text-white/70' : 'text-secondary'}`}>✓</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Main form card — one continuous page, no Text/Images tab split */}
      <div className="bg-card border border-primary/20 rounded-2xl shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] p-8 space-y-6">
        {/* Article Title */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('articleTitleLabel')}</label>
          <input
            type="text"
            value={als.title}
            onChange={(e) => setLocaleField('title', e.target.value)}
            placeholder={t('titlePlaceholder')}
            required
            className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        {/* Subtitle (Excerpt) */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('subtitleLabel')}</label>
          <input
            type="text"
            value={als.excerpt}
            onChange={(e) => setLocaleField('excerpt', e.target.value)}
            placeholder={t('subtitlePlaceholder')}
            className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>

        {/* Topic/Category (Tags) — global, not locale-specific */}
        {activeLocale === sourceLocale && (
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">{t('topicCategoryLabel')}</label>
            <TagsInput value={tags} onChange={setTags} placeholder={t('topicCategoryPlaceholder')} />
          </div>
        )}

        {/* Featured Summary */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('featuredSummaryLabel')}</label>
          <p className="text-xs text-muted-foreground -mt-1">{t('featuredSummaryHint')}</p>
          <textarea
            value={als.featuredSummary}
            onChange={(e) => setLocaleField('featuredSummary', e.target.value)}
            placeholder={t('featuredSummaryPlaceholder')}
            rows={4}
            className="w-full px-4 py-3 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Full Content — keyed by locale to force re-mount on switch */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('fullContentLabel')}</label>
          <div className="rounded-[10px] border border-primary/20 overflow-hidden">
            <RichTextEditor
              key={activeLocale}
              value={als.body}
              onChange={handleBodyChange}
              placeholder={t('bodyPlaceholder')}
              locale={uiLocale}
              initialHtml={als.bodyHtml}
            />
          </div>
        </div>

        {/* Cover Image */}
        <CoverImageInput
          name="cover_image_url"
          defaultValue={coverImageUrl}
          onChange={setCoverImageUrl}
        />
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('coverImageCreditLabel')}</label>
          <PhotoCreditInput
            name="image_credits"
            value={imageCredits}
            onChange={setImageCredits}
            placeholder={t('coverImageCreditPlaceholder')}
          />
        </div>
        <p className="text-xs text-muted-foreground -mt-4">
          {t('photoGuidelineHint')}
        </p>

        {/* Author info (read-only) */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">{t('authorNameLabel')}</label>
          <div className="h-[50px] px-4 flex items-center rounded-[10px] border border-primary/10 bg-primary/5 text-foreground text-base">
            {authorName}
          </div>
        </div>

        {/* Feature submission — only for source locale */}
        {activeLocale === sourceLocale && (
          <div
            className="rounded-[16px] p-6 border-2"
            style={{ background: '#fff9f0', borderColor: '#b8860b', boxShadow: '0px 2px 8px 0px rgba(184,134,11,0.1)' }}
          >
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={featureRequested}
                onChange={(e) => setFeatureRequested(e.target.checked)}
                className="mt-1 w-4 h-4 rounded accent-[#b8860b]"
              />
              <div>
                <p className="font-semibold text-[#5d4e37] mb-1">{t('featureRequestTitle')}</p>
                <p className="text-sm text-[#6b5744] leading-relaxed">
                  {t('featureRequestDescription')}
                </p>
              </div>
            </label>
          </div>
        )}
      </div>

      {/* Publish confirmation — required before every publish, not persisted */}
      {status === 'draft' && (
        <div
          className="rounded-[16px] p-6 border-2 mt-6"
          style={{ background: '#fdf5f5', borderColor: '#8b4513', boxShadow: '0px 2px 8px 0px rgba(139,69,19,0.1)' }}
        >
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={publishConfirmed}
              onChange={(e) => setPublishConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded accent-[#8b4513]"
            />
            <p className="text-sm text-[#4b3a2a] leading-relaxed">
              {t('publishConfirmationText')}
            </p>
          </label>
        </div>
      )}

      {/* Bottom action bar */}
      <div className="flex gap-4 mt-6">
        <button
          type="button"
          onClick={doSave}
          disabled={isPending || !activeTitle.trim()}
          className="flex-1 h-[54px] rounded-[16px] text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(175.88deg, #8b4513 0%, #a0522d 100%)' }}
        >
          {isPending ? td('saving') : td('saveChanges')}
        </button>

        {status === 'draft' ? (
          <button
            type="button"
            onClick={() => startTransition(() => publishArticle(id, new FormData()))}
            disabled={isPending || !publishConfirmed}
            title={!publishConfirmed ? t('publishConfirmTooltip') : undefined}
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

        <button
          type="button"
          onClick={() => {
            if (confirm(td('deleteConfirm'))) startTransition(() => deleteArticle(id))
          }}
          disabled={isPending}
          className="h-[54px] px-4 rounded-[16px] text-sm font-['JetBrains_Mono',monospace] text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
          aria-label={t('deleteArticleAriaLabel')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
