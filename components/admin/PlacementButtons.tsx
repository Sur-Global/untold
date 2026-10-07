'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleFeatured, toggleHomeFeatured, toggleHeroFeatured, type ActionResult } from '@/lib/actions/admin'
import { Button } from '@/components/ui/button'

interface Props {
  contentId: string
  isFeatured: boolean
  isHomeFeatured: boolean
  isHeroFeatured: boolean
}

const BUTTONS = [
  { key: 'page', icon: '★', action: toggleFeatured, title: 'Featured at the top of its own page (Podcasts, Videos…)' },
  { key: 'home', icon: '⌂', action: toggleHomeFeatured, title: 'Shown in its section on the homepage' },
  { key: 'hero', icon: '↑', action: toggleHeroFeatured, title: 'Homepage hero banner (top of the homepage)' },
] as const

export function PlacementButtons({ contentId, isFeatured, isHomeFeatured, isHeroFeatured }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const active = { page: isFeatured, home: isHomeFeatured, hero: isHeroFeatured }

  const click = (key: string, action: (id: string) => Promise<ActionResult>) => {
    setError(null)
    setBusy(key)
    startTransition(async () => {
      try {
        const result = await action(contentId)
        if (!result.ok) setError(result.error)
        else router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed')
      }
    })
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className="inline-flex items-center gap-1">
        {BUTTONS.map(({ key, icon, action, title }) => (
          <Button
            key={key}
            variant="ghost"
            size="sm"
            onClick={() => click(key, action)}
            disabled={pending}
            title={`${title} — ${active[key] ? 'click to remove' : 'click to add'}`}
            aria-pressed={active[key]}
            className={`h-7 w-8 px-0 text-base ${
              active[key] ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'text-muted-foreground'
            }`}
          >
            {pending && busy === key ? '…' : icon}
          </Button>
        ))}
      </span>
      {error && <span className="max-w-[18rem] text-xs font-medium text-[#991b1b]">{error}</span>}
    </span>
  )
}
