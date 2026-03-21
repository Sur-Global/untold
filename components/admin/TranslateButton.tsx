'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { retranslate } from '@/lib/actions/translate'
import { Button } from '@/components/ui/button'

interface TranslateButtonProps {
  contentId: string
  locale: string
}

export function TranslateButton({ contentId, locale }: TranslateButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await retranslate(contentId, locale)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Translation failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending}
        className="h-6 px-2 text-xs text-red-600 hover:text-red-700"
      >
        {isPending ? '…' : 'Translate'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
