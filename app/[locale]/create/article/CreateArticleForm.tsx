'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'

export function CreateArticleForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<import('@blocknote/core').Block[] | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [featureRequested, setFeatureRequested] = useState(false)
  const [activeTab, setActiveTab] = useState<'text' | 'images'>('text')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    fd.set('tag_ids', JSON.stringify(tags.map((t) => t.id)))
    fd.set('feature_requested', String(featureRequested))
    startTransition(() => createArticle(fd))
  }

  const tabs = [
    { id: 'text', label: 'Text' },
    { id: 'images', label: 'Images' },
  ] as const

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
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

      {/* Main card */}
      <div className="bg-card border border-primary/20 rounded-2xl shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] p-8 space-y-6">

        {activeTab === 'text' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Article Title</label>
              <input
                type="text"
                name="title"
                placeholder={t('titlePlaceholder')}
                required
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-transparent text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Subtitle</label>
              <input
                type="text"
                name="excerpt"
                placeholder="How communities are reclaiming their spaces"
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-transparent text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Topic / Category</label>
              <TagsInput value={tags} onChange={setTags} placeholder="Urban Planning, Human Rights…" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Featured Summary</label>
              <p className="text-xs text-muted-foreground -mt-1">Shown publicly only when this article is featured</p>
              <textarea
                name="featured_summary"
                placeholder="Urban regeneration is not just about new buildings…"
                rows={4}
                className="w-full px-4 py-3 rounded-[10px] border border-primary/20 bg-transparent text-foreground text-base outline-none focus:border-primary/50 transition-colors resize-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Full Content</label>
              <div className="rounded-[10px] border border-primary/20 overflow-hidden">
                <RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} />
              </div>
            </div>

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
            <CoverImageInput name="cover_image_url" />
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground">Cover image credit</label>
              <input
                type="text"
                name="image_credits"
                placeholder="e.g. Chris Lawton on Unsplash"
                className="w-full h-[50px] px-4 rounded-[10px] border border-primary/20 bg-transparent text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={isPending}
          className="w-full h-[54px] rounded-[16px] text-sm font-['JetBrains_Mono',monospace] font-medium tracking-[0.28px] text-white transition-opacity disabled:opacity-50"
          style={{ background: 'linear-gradient(175.88deg, #8b4513 0%, #a0522d 100%)' }}
        >
          {isPending ? td('saving') : td('saveAsDraft')}
        </button>
      </div>
    </form>
  )
}
