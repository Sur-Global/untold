'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { TagsInput, type Tag } from '@/components/ui/TagsInput'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { SlidesEditor } from '@/components/pills/SlidesEditor'
import { blocksTextLength, PILL_TEXT_MAX_CHARS, type PillSlide } from '@/lib/pill-slides'
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
}

/**
 * What changes between the two kinds of knowledge pill: a very short text (with an optional picture), or a
 * carousel of slides with a description. Tags are asked for in both.
 */
export function PillContentFields({
  format, onFormatChange, slides, onSlidesChange, description, onDescriptionChange, body, onBodyChange, tags, onTagsChange, initialImageUrl,
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
            <SlidesEditor slides={slides} onChange={onSlidesChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t('carouselDescriptionLabel')}</Label>
            <textarea
              id="description"
              value={description}
              maxLength={600}
              rows={3}
              onChange={(e) => onDescriptionChange(e.target.value)}
              placeholder={t('carouselDescriptionPlaceholder')}
              className="w-full rounded-[10px] border border-primary/20 bg-white px-4 py-3 text-base outline-none focus:border-primary/50"
            />
            <p className="text-xs text-muted-foreground">{t('carouselDescriptionHint')}</p>
          </div>
        </>
      ) : (
        <>
          <CoverImageInput name="image_url" defaultValue={initialImageUrl} label={t('coverPillLabel')} sizeHint={t('coverPillHint')} {...coverInputProps('pill')} />
          <div className="space-y-2">
            <Label>{t('bodyLabel')}</Label>
            <RichTextEditor value={body} onChange={onBodyChange} placeholder={t('bodyPlaceholder')} locale={locale} videos="none" />
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
