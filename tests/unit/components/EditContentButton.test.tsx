import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('next-intl/server', () => ({ getTranslations: async () => (key: string) => (key === 'edit' ? 'Editar' : key) }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))

import { EditContentButton } from '@/components/content/EditContentButton'

const props = { contentId: 'c1', authorId: 'author-1' }

describe('EditContentButton', () => {
  it('shows an Edit link for an admin on a video, a pill, a podcast and a course', async () => {
    for (const [type, segment] of [['video', 'videos'], ['pill', 'pills'], ['podcast', 'podcasts'], ['course', 'courses'], ['article', 'articles']] as const) {
      const { unmount } = render(await EditContentButton({ ...props, type, userId: 'admin-1', role: 'admin' }))
      expect(screen.getByRole('link', { name: 'Editar' })).toHaveAttribute('href', `/dashboard/${segment}/c1/edit`)
      unmount()
    }
  })

  it('shows it to the author too, and to editors', async () => {
    render(await EditContentButton({ ...props, type: 'video', userId: 'author-1', role: 'author' }))
    expect(screen.getByRole('link', { name: 'Editar' })).toBeInTheDocument()
  })

  it('shows nothing to other members or visitors', async () => {
    const { container } = render((await EditContentButton({ ...props, type: 'video', userId: 'other', role: 'user' })) ?? <></>)
    expect(container).toBeEmptyDOMElement()
    const visitor = render((await EditContentButton({ ...props, type: 'video', userId: null, role: null })) ?? <></>)
    expect(visitor.container).toBeEmptyDOMElement()
  })
})
