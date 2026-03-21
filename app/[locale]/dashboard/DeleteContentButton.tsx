'use client'

import { useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { deleteContent } from '@/lib/actions/content'
import { Button } from '@/components/ui/button'

export function DeleteContentButton({ id }: { id: string }) {
  const td = useTranslations('dashboard')
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      onClick={() => {
        if (confirm(td('deleteContentConfirm'))) {
          startTransition(() => deleteContent(id))
        }
      }}
    >
      {td('deleteContent')}
    </Button>
  )
}
