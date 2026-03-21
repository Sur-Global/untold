import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/actions/social', () => ({
  toggleLike: vi.fn().mockResolvedValue(undefined),
  toggleBookmark: vi.fn().mockResolvedValue(undefined),
}))

import { BookmarkButton } from '@/components/social/BookmarkButton'

describe('BookmarkButton', () => {
  it('renders a button', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={true} />
    )
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('is disabled when not logged in', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={false} />
    )
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('toggles optimistically on click', () => {
    render(
      <BookmarkButton contentId="abc" initialIsBookmarked={false} isLoggedIn={true} />
    )
    const btn = screen.getByRole('button')
    const beforeTitle = btn.getAttribute('title')
    fireEvent.click(btn)
    expect(btn.getAttribute('title')).not.toBe(beforeTitle)
  })
})
