'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createPill } from '@/lib/actions/pill'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import type { Tag } from '@/components/ui/TagsInput'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AccentColorPicker } from '@/components/pills/AccentColorPicker'
import { PillContentFields, type PillFormat } from '@/components/pills/PillContentFields'
import type { PillSlide } from '@/lib/pill-slides'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'
import { FeatureRequestField } from '@/components/content/FeatureRequestField'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'

export function CreatePillForm({ brandLogos = false }: { brandLogos?: boolean }) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<EditorBlock[] | null>(null)
  const [format, setFormat] = useState<PillFormat>('text')
  const [slides, setSlides] = useState<PillSlide[]>([])
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState<Tag[]>([])
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)
  // Mirrors publishRef for rendering (refs can't be read during render)
  const [publishing, setPublishing] = useState(false)
  const [declared, setDeclared] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body && format === 'text') fd.set('body', JSON.stringify(body))
    fd.set('format', format)
    fd.set('slides', JSON.stringify(slides))
    fd.set('description', description)
    fd.set('tag_ids', JSON.stringify(tags.map((tag) => tag.id)))
    fd.set('publish', String(publishRef.current))
    startTransition(() => createPill(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />
      <LanguageAvailabilityFields />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <AccentColorPicker />

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
        brandLogos={brandLogos}
      />

      <FeatureRequestField />

      <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => { publishRef.current = false; setPublishing(false) }}
        >
          {isPending && !publishing ? td('saving') : td('saveAsDraft')}
        </Button>
        <Button
          type="submit"
          disabled={isPending || !declared}
          onClick={() => { publishRef.current = true; setPublishing(true) }}
          className="gradient-rust text-white border-0"
        >
          {isPending && publishing ? td('saving') : td('publish')}
        </Button>
      </div>
    </form>
  )
}
