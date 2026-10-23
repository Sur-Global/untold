'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updatePill } from '@/lib/actions/pill'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import type { Tag } from '@/components/ui/TagsInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccentColorPicker } from '@/components/pills/AccentColorPicker'
import { PillContentFields, type PillFormat } from '@/components/pills/PillContentFields'
import type { PillSlide } from '@/lib/pill-slides'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { FeatureRequestField } from '@/components/content/FeatureRequestField'
import { ViewContentLink } from '@/components/content/ViewContentLink'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'

interface EditPillFormProps {
  id: string
  status: string
  initialAuthorId: string
  slug: string
  initialSingleLanguage?: boolean
  initialDeclared?: boolean
  initialFeatureRequested?: boolean
  initialTitle: string
  initialBody: EditorBlock[] | null
  initialAccentColor: string
  initialImageUrl: string
  initialFormat?: PillFormat
  initialSlides?: PillSlide[]
  initialDescription?: string
  initialTags?: Tag[]
  brandLogos?: boolean
}

export function EditPillForm({
  id, status, initialAuthorId, slug, initialSingleLanguage = false, initialDeclared = false, initialFeatureRequested = false, initialTitle, initialBody, initialAccentColor, initialImageUrl,
  initialFormat = 'text', initialSlides = [], initialDescription = '', initialTags = [], brandLogos = false,
}: EditPillFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [declared, setDeclared] = useState(initialDeclared)
  const publishNow = () =>
    startTransition(async () => {
      const fd = new FormData()
      fd.set('responsibility_confirmed', String(declared))
      await publishContent(id, fd)
    })
  const [body, setBody] = useState<EditorBlock[] | null>(initialBody)
  const [format, setFormat] = useState<PillFormat>(initialFormat)
  const [slides, setSlides] = useState<PillSlide[]>(initialSlides)
  const [description, setDescription] = useState(initialDescription)
  const [tags, setTags] = useState<Tag[]>(initialTags)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body && format === 'text') fd.set('body', JSON.stringify(body))
    fd.set('format', format)
    fd.set('slides', JSON.stringify(slides))
    fd.set('description', description)
    fd.set('tag_ids', JSON.stringify(tags.map((tag) => tag.id)))
    startTransition(() => updatePill(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <AuthorPicker defaultValue={initialAuthorId} />
      <LanguageAvailabilityFields defaultSingle={initialSingleLanguage} />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <AccentColorPicker defaultValue={initialAccentColor} />

      <PillContentFields
        format={format}
        onFormatChange={setFormat}
        slides={slides}
        onSlidesChange={setSlides}
        description={description}
        onDescriptionChange={setDescription}
        body={body}
        onBodyChange={setBody}
        tags={tags}
        onTagsChange={setTags}
        initialImageUrl={initialImageUrl}
        brandLogos={brandLogos}
      />

      <FeatureRequestField defaultChecked={initialFeatureRequested} />

      {status === 'draft' && <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'published' && <ViewContentLink type="pill" slug={slug} />}
        {status === 'draft' ? (
          <Button type="button" variant="outline" disabled={isPending || !declared}
            onClick={publishNow}>
            {td('publish')}
          </Button>
        ) : (
          <Button type="button" variant="outline" disabled={isPending}
            onClick={() => startTransition(() => unpublishContent(id, new FormData()))}>
            {td('unpublish')}
          </Button>
        )}

        <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700 ml-auto"
          disabled={isPending}
          onClick={() => { if (confirm(td('deleteContentConfirm'))) startTransition(() => deleteContent(id)) }}>
          {td('deleteContent')}
        </Button>
      </div>
    </form>
  )
}
