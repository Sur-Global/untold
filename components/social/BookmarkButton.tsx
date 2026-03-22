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
      <svg width="16" height="16" viewBox="0 0 16 16" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 2.5A1.5 1.5 0 014.5 1h7A1.5 1.5 0 0113 2.5v12l-5-3-5 3v-12z"/>
      </svg>
    </button>
  )
}
