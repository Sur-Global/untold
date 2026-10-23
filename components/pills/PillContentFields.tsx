'use client'

import { useLayoutEffect, useRef } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { SlidesEditor } from '@/components/pills/SlidesEditor'
import { blocksTextLength, PILL_DESCRIPTION_MAX, PILL_TEXT_MAX_CHARS, type PillSlide } from '@/lib/pill-slides'
import { coverInputProps } from '@/lib/cover-formats'

export type PillFormat = 'text' | 'carousel'

interface Props {
  format: PillFormat
  onFormatChange: (format: PillFormat) => void
  slides: PillSlide[]
  onSlidesChange: (slides: PillSlide[]) => void
  description: string
  onDescriptionChange: (text: string) => void
  body: EditorBlock[] | null
  onBodyChange: (body: EditorBlock[] | null) => void
  tags: Tag[]
  onTagsChange: (tags: Tag[]) => void
  initialImageUrl?: string
  /** Admins and editors can put the UNTOLD / SurGlobal logo on the slides */
  brandLogos?: boolean
}

/** A text box that grows with what is written, so the whole text is always visible (no scrolling inside it) */
function GrowingTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    box.style.height = 'auto'
    box.style.height = `${box.scrollHeight}px`
  }, [props.value])
  return <textarea ref={ref} {...props} style={{ overflow: 'hidden', resize: 'none', ...props.style }} />
}

/**
 * What changes between the two kinds of knowledge pill: a very short text (with an optional picture), or a
 * carousel of slides with a description. Tags are asked for in both.
 */
export function PillContentFields({
  format, onFormatChange, slides, onSlidesChange, description, onDescriptionChange, body, onBodyChange, tags, onTagsChange, initialImageUrl, brandLogos = false,
}: Props) {
  const t = useTranslations('editor')
  const locale = useLocale()
  const length = blocksTextLength(body)
  const tooLong = length > PILL_TEXT_MAX_CHARS

  const toggle = (value: PillFormat, label: string) => (
    <button
      type="button"
      role="radio"
      aria-checked={format === value}
      onClick={() => onFormatChange(value)}
      className="h-10 rounded-[10px] px-4 text-sm transition-colors"
      style={{ border: '1.5px solid #000', background: format === value ? '#000' : '#fff', color: format === value ? '#fff' : '#000' }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div className="space-y-2">
        <Label>{t('pillFormatLabel')}</Label>
        <div role="radiogroup" aria-label={t('pillFormatLabel')} className="flex flex-wrap gap-2">
          {toggle('text', t('pillFormatText'))}
          {toggle('carousel', t('pillFormatCarousel'))}
        </div>
        <p className="text-xs text-muted-foreground">{format === 'carousel' ? t('pillFormatCarouselHint') : t('pillFormatTextHint', { max: PILL_TEXT_MAX_CHARS })}</p>
      </div>

      {format === 'carousel' ? (
        <>
          <div className="space-y-2">
            <Label>{t('slidesLabel')}</Label>
            <SlidesEditor slides={slides} onChange={onSlidesChange} brandLogos={brandLogos} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('carouselDescriptionLabel')}</Label>
            <GrowingTextarea
              id="description"
              value={description}
              maxLength={PILL_DESCRIPTION_MAX}
              rows={3}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('carouselDescriptionPlaceholder')}
              className="w-full rounded-[10px] border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground">{t('carouselDescriptionHint')}</p>
            <p className="text-xs font-medium text-foreground" aria-live="polite" data-description-counter>
              {t('descriptionCharsLeft', { count: PILL_DESCRIPTION_MAX - description.length })}
            </p>
          </div>
        </>
      ) : (
        <>
          <CoverImageInput name="image_url" defaultValue={initialImageUrl} label={t('coverPillLabel')} sizeHint={t('coverPillHint')} {...coverInputProps('pill')} />
          <div className="space-y-2">
            <Label>{t('bodyLabel')}</Label>
            <div className="overflow-hidden rounded-[10px] border border-primary/20">
              <RichTextEditor value={body} onChange={onBodyChange} placeholder={t('bodyPlaceholder')} locale={locale} videos="none" />
            </div>
            <p className={`text-xs ${tooLong ? 'font-semibold text-red-600' : 'text-muted-foreground'}`} aria-live="polite">
              {t('textCounter', { count: length, max: PILL_TEXT_MAX_CHARS })}{tooLong ? ` — ${t('textTooLong')}` : ''}
            </p>
          </div>
        </>
      )}

      <div className="space-y-2">
        <Label>{t('pillTagsLabel')}</Label>
        <TagsInput value={tags} onChange={onTagsChange} placeholder={t('topicCategoryPlaceholder')} />
        <p className="text-xs text-muted-foreground">{t('pillTagsHint')}</p>
      </div>
    </>
  )
}
