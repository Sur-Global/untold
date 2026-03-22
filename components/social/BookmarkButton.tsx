'use client'

import { useState, useTransition } from 'react'
import { toggleBookmark } from '@/lib/actions/social'

interface BookmarkButtonProps {
  contentId: string
  initialIsBookmarked: boolean
  isLoggedIn: boolean
  className?: string
}

export function BookmarkButton({ contentId, initialIsBookmarked, isLoggedIn, className }: BookmarkButtonProps) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsBookmarked(!isBookmarked)
    startTransition(() => toggleBookmark(contentId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? (isBookmarked ? 'Remove bookmark' : 'Bookmark') : 'Sign in to bookmark'}
      className={className ?? "flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      {isBookmarked ? '🔖' : '🏷'}
    </button>
  )
}
