import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleFollow: vi.fn().mockResolvedValue(undefined),
}))

import { FollowButton } from '@/components/social/FollowButton'

describe('FollowButton', () => {
  it('renders Follow when not following', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Follow')
  })

  it('renders Following when already following', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={true} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toHaveTextContent('Following')
  })

  it('is disabled when not logged in', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={false} />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <FollowButton profileId="p1" initialIsFollowing={false} isLoggedIn={true} />
    )
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn).toHaveTextContent('Following')
  })
})
