'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn, getPublicContentPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'

const LABEL_KEY = {
  article: 'viewMyArticle',
  video: 'viewMyVideo',
  podcast: 'viewMyPodcast',
  pill: 'viewMyPill',
  course: 'viewMyCourse',
} as const

/** "View my article / video / pill…" — opens the published page of a content item. */
export function ViewContentLink({
  type,
  slug,
  variant = 'outline',
}: {
  type: ContentType
  slug: string
  variant?: 'outline' | 'ghost'
}) {
  const t = useTranslations('dashboard')
  return (
    <Link href={getPublicContentPath(type, slug)} className={cn(buttonVariants({ variant, size: 'sm' }))}>
      {t(LABEL_KEY[type])} ↗
    </Link>
  )
}
