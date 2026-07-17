'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleHeroFeatured } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
  isFeatured: boolean
  isHeroFeatured: boolean
}

export function HeroFeatureButton({ contentId, isFeatured, isHeroFeatured }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleClick = () => {
    setError(null)
    startTransition(async () => {
      try {
        await toggleHeroFeatured(contentId)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        disabled={isPending || !isFeatured}
        title={!isFeatured ? 'Must be Featured before it can go in the homepage hero' : 'Toggle homepage hero placement'}
        className={`h-6 px-2 text-sm ${
          isHeroFeatured ? 'text-primary' : 'text-muted-foreground'
        } ${!isFeatured ? 'opacity-40' : ''}`}
      >
        {isPending ? '…' : isHeroFeatured ? '⌂ Hero' : '⌂'}
      </Button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  )
}
