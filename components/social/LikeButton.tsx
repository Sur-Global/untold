'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/lib/actions/social'

interface LikeButtonProps {
  contentId: string
  initialIsLiked: boolean
  initialCount: number
  isLoggedIn: boolean
  className?: string
}

export function LikeButton({ contentId, initialIsLiked, initialCount, isLoggedIn, className }: LikeButtonProps) {
  const [isLiked, setIsLiked] = useState(initialIsLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsLiked(!isLiked)
    setCount(c => isLiked ? c - 1 : c + 1)
    startTransition(() => toggleLike(contentId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? undefined : 'Sign in to like'}
      className={className ?? "flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M8 13.5C8 13.5 1.5 9.5 1.5 5.5C1.5 3.567 3.067 2 5 2C6.195 2 7.245 2.617 8 3.5C8.755 2.617 9.805 2 11 2C12.933 2 14.5 3.567 14.5 5.5C14.5 9.5 8 13.5 8 13.5Z"/>
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
