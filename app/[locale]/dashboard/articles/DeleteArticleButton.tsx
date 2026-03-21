'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteArticle } from '@/lib/actions/article'

export function DeleteArticleButton({ id }: { id: string }) {
  const td = useTranslations('dashboard')
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      onClick={() => {
        if (confirm(td('deleteConfirm'))) {
          startTransition(() => deleteArticle(id))
        }
      }}
    >
      {td('deleteArticle')}
    </Button>
  )
}
