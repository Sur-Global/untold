import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AuthorByline } from '@/components/content/AuthorByline'

vi.mock('@/i18n/navigation', () => ({ Link: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }))

describe('AuthorByline', () => {
  it('shows who wrote it, linking to their page, with their photo and the date', () => {
    const { container } = render(<AuthorByline author={{ display_name: 'Elsie Ralston', slug: 'elsie-ralston', avatar_url: 'https://cdn/e.png' }} publishedAt="2026-10-23T15:49:31.622+00:00" locale="es" />)
    expect(screen.getByRole('link', { name: /Elsie Ralston/ })).toHaveAttribute('href', '/author/elsie-ralston')
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://cdn/e.png')
    expect(screen.getByText(/2026/)).toBeInTheDocument()
  })
  it('shows the initial when there is no photo, and no date when it is not published', () => {
    render(<AuthorByline author={{ display_name: 'Sara', slug: 'sara' }} locale="es" />)
    expect(screen.getByText('S')).toBeInTheDocument()
    expect(screen.queryByText(/20\d\d/)).toBeNull()
  })
})
