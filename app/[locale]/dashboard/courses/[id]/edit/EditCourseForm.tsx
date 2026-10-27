'use client'

import { useRef, useState, useTransition } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { updateCourse } from '@/lib/actions/course'
import { publishContent, unpublishContent, deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ViewContentLink } from '@/components/content/ViewContentLink'
import { ResponsibilityDeclaration } from '@/components/content/ResponsibilityDeclaration'
import { LanguageAvailabilityFields } from '@/components/content/LanguageAvailabilityFields'
import { RichTextEditor } from '@/components/editor/RichTextEditorLazy'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { CourseDetailsFields, CoursePeopleFields, CourseRegistrationFields, type CourseFormInitial } from '@/components/courses/CourseFormFields'

interface EditCourseFormProps {
  id: string
  status: string
  initialAuthorId: string
  slug: string
  initialSingleLanguage?: boolean
  initialDeclared?: boolean
  initialTitle: string
  initialCoverImageUrl: string
  /** the subtitle, the course data and the registration */
  initial: CourseFormInitial
  /** the full description (rich text) */
  initialBody: EditorBlock[] | null
}

export function EditCourseForm({
  id, status, initialAuthorId, slug, initialSingleLanguage = false, initialDeclared = false, initialTitle, initialCoverImageUrl, initial, initialBody,
}: EditCourseFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const locale = useLocale()
  const [body, setBody] = useState<EditorBlock[] | null>(initialBody)
  const formRef = useRef<HTMLFormElement>(null)
  const [declared, setDeclared] = useState(initialDeclared)
  const publishNow = () =>
    startTransition(async () => {
      const fd = new FormData()
      fd.set('responsibility_confirmed', String(declared))
      await publishContent(id, fd)
    })
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => updateCourse(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <AuthorPicker defaultValue={initialAuthorId} />
      <LanguageAvailabilityFields defaultSingle={initialSingleLanguage} />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" defaultValue={initialTitle} placeholder={t('titlePlaceholder')} required className={FIELD_CLASS} />
      </div>

      <CoverImageInput name="cover_image_url" uploadType="hero" defaultValue={initialCoverImageUrl} />

      <CourseDetailsFields initial={initial} />

      <div className="space-y-2">
        <Label>{t('courseBodyLabel')}</Label>
        <p className="text-xs text-muted-foreground">{t('courseBodyHint')}</p>
        <div className="overflow-hidden rounded-[10px] border border-primary/20">
          <RichTextEditor value={initialBody} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
        </div>
      </div>

      <CoursePeopleFields initial={initial} />

      <CourseRegistrationFields initial={initial} />

      {status === 'draft' && <ResponsibilityDeclaration checked={declared} onChange={setDeclared} />}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isPending} className="gradient-rust text-white border-0">
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'published' && <ViewContentLink type="course" slug={slug} />}
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
