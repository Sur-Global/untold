'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateArticle, publishArticle, unpublishArticle, deleteArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditArticleFormProps {
  id: string
  status: string
  initialTitle: string
  initialExcerpt: string
  initialCoverImageUrl: string
  initialBody: Record<string, unknown> | null
}

export function EditArticleForm({
  id,
  status,
  initialTitle,
  initialExcerpt,
  initialCoverImageUrl,
  initialBody,
}: EditArticleFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(initialBody)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => updateArticle(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialTitle}
          placeholder={t('titlePlaceholder')}
          required
          className="text-xl font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Input
          id="excerpt"
          name="excerpt"
          defaultValue={initialExcerpt}
          placeholder={t('excerptPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          defaultValue={initialCoverImageUrl}
          placeholder={t('coverImagePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="gradient-rust text-white border-0"
        >
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(() => publishArticle(id, new FormData()))}
            disabled={isPending}
          >
            {td('publish')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(() => unpublishArticle(id, new FormData()))}
            disabled={isPending}
          >
            {td('unpublish')}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          className="text-red-600 hover:text-red-700 ml-auto"
          onClick={() => {
            if (confirm(td('deleteConfirm'))) {
              startTransition(() => deleteArticle(id))
            }
          }}
          disabled={isPending}
        >
          {td('deleteArticle')}
        </Button>
      </div>
    </form>
  )
}
