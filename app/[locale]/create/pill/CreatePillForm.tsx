'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createPill } from '@/lib/actions/pill'
import { RichTextEditor } from '@/components/editor/RichTextEditorLazy'
import type { EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AuthorPicker } from '@/components/content/AuthorPicker'
import { ContentLanguageSelect } from '@/components/content/ContentLanguageSelect'

export function CreatePillForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const locale = useLocale()
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<EditorBlock[] | null>(null)
  const [isPending, startTransition] = useTransition()
  // Which submit button was pressed (draft vs publish)
  const publishRef = useRef(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    fd.set('publish', String(publishRef.current))
    startTransition(() => createPill(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <AuthorPicker />
      <ContentLanguageSelect />

      <div className="space-y-2">
        <Label htmlFor="title">{t('titleRequiredLabel')}</Label>
        <Input id="title" name="title" placeholder={t('titlePlaceholder')} required className="text-xl font-semibold" />
      </div>

      <div className="space-y-2">
        <Label>{t('accentColorLabel')}</Label>
        <div className="flex items-center gap-3">
          <input
            id="accent_color"
            name="accent_color"
            type="color"
            defaultValue="#C45D3A"
            className="w-10 h-10 rounded cursor-pointer border border-[rgba(139,69,19,0.2)]"
          />
          <span className="text-sm text-[#6B5F58]">{t('pickAccentColorHint')}</span>
        </div>
      </div>

      <CoverImageInput name="image_url" />

      <div className="space-y-2">
        <Label>{t('bodyLabel')}</Label>
        <RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="submit"
          variant="outline"
          disabled={isPending}
          onClick={() => { publishRef.current = false }}
        >
          {isPending && !publishRef.current ? td('saving') : td('saveAsDraft')}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          onClick={() => { publishRef.current = true }}
          className="gradient-rust text-white border-0"
        >
          {isPending && publishRef.current ? td('saving') : td('publish')}
        </Button>
      </div>
    </form>
  )
}
