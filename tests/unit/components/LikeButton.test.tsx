import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleLike: vi.fn().mockResolvedValue(undefined),
  toggleBookmark: vi.fn().mockResolvedValue(undefined),
}))

import { LikeButton } from '@/components/social/LikeButton'

describe('LikeButton', () => {
  it('renders with initial count and like state', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={5}
        isLoggedIn={true}
      />
    )
    expect(screen.getByRole('button')).toHaveTextContent('5')
  })

  it('shows filled heart when initially liked', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={true}
        initialCount={3}
        isLoggedIn={true}
      />
    )
    expect(screen.getByRole('button').textContent).toContain('♥')
  })

  it('is disabled when not logged in', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={0}
        isLoggedIn={false}
      />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <LikeButton
        contentId="abc"
        initialIsLiked={false}
        initialCount={5}
        isLoggedIn={true}
      />
    )
    const btn = screen.getByRole('button')
    fireEvent.click(btn)
    expect(btn.textContent).toContain('6')
  })
})
