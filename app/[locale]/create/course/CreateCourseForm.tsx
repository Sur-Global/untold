'use client'

import { useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { createCourse } from '@/lib/actions/course'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'
import { RichTextEditor } from '@/components/editor/RichTextEditorLazy'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { CourseDetailsFields, CoursePeopleFields, CourseRegistrationFields } from '@/components/courses/CourseFormFields'
import { courseTemplateBlocks } from '@/lib/course-page'

export function CreateCourseForm() {
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
  // The full description: until it is edited, nothing is saved (the editor only starts with the sections to fill in)
  const [body, setBody] = useState<EditorBlock[] | null>(null)
  const [template] = useState(() =>
    courseTemplateBlocks([t('courseTemplateLearn'), t('courseTemplateProgram'), t('courseTemplateIncludes'), t('courseTemplateFaq')]) as EditorBlock[],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    fd.set('publish', String(publishRef.current))
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => createCourse(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />
      {/* A course is shown in the language it was written in unless it is chosen otherwise (long texts cost a lot to translate) */}
      <LanguageAvailabilityFields defaultSingle />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className={FIELD_CLASS} />
      </div>

      <CoverImageInput name="cover_image_url" uploadType="hero" />

      <CourseDetailsFields />

      <div className="space-y-2">
        <Label>{t('courseBodyLabel')}</Label>
        <p className="text-xs text-muted-foreground">{t('courseBodyHint')}</p>
        <div className="overflow-hidden rounded-[10px] border border-primary/20">
          <RichTextEditor value={body ?? template} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
        </div>
      </div>

      <CoursePeopleFields />

      <CourseRegistrationFields />

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
