'use client'

import { useState, useTransition } from 'react'
import { toggleLike } from '@/lib/actions/social'

interface LikeButtonProps {
  contentId: string
  initialIsLiked: boolean
  initialCount: number
  isLoggedIn: boolean
}

export function LikeButton({ contentId, initialIsLiked, initialCount, isLoggedIn }: LikeButtonProps) {
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
      className="flex items-center gap-1.5 text-sm font-mono text-[#6B5F58] hover:text-[#A0522D] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <span>{isLiked ? '♥' : '♡'}</span>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
