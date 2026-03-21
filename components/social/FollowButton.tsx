'use client'

import { useState, useTransition } from 'react'
import { toggleFollow } from '@/lib/actions/social'

interface FollowButtonProps {
  profileId: string
  initialIsFollowing: boolean
  isLoggedIn: boolean
}

export function FollowButton({ profileId, initialIsFollowing, isLoggedIn }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    setIsFollowing(!isFollowing)
    startTransition(() => toggleFollow(profileId))
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending || !isLoggedIn}
      title={isLoggedIn ? undefined : 'Sign in to follow'}
      className="px-4 py-1.5 rounded-full text-sm font-mono font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={
        isFollowing
          ? { background: 'rgba(160,82,45,0.12)', color: '#A0522D', border: '1px solid rgba(160,82,45,0.3)' }
          : { background: 'rgba(160,82,45,0.85)', color: '#FAF7F2', border: '1px solid transparent' }
      }
    >
      {isFollowing ? 'Following' : 'Follow'}
    </button>
  )
}
