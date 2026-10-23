import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BannersForm } from '@/components/admin/BannersForm'
import { DEFAULT_HOME_BANNERS } from '@/lib/home-banners'
import { saveHomeBanners } from '@/lib/actions/home-banners'

vi.mock('@/lib/actions/home-banners', () => ({ saveHomeBanners: vi.fn() }))
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))

const copy = { adLabel: 'Advertisement', eyebrow: 'Write on UNTOLD', title: 'Have a story?', text: 'Tell it here.', cta: 'Publish' }
const props = { initial: DEFAULT_HOME_BANNERS, copy: { top: copy, bottom: { ...copy, title: 'SurGlobal' } }, houseLinks: { top: '/create', bottom: 'https://surglobal.io' } }

describe('BannersForm (Admin → Advertising)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('shows both banners with where each one appears and a preview of UNTOLD’s own promo', () => {
    render(<BannersForm {...props} />)
    expect(screen.getByText('Banner 1')).toBeInTheDocument()
    expect(screen.getByText(/just before the Videos section/)).toBeInTheDocument()
    expect(screen.getByText('Banner 2')).toBeInTheDocument()
    expect(screen.getByText(/just after the Knowledge Pills section/)).toBeInTheDocument()
    expect(screen.getByText('Have a story?')).toBeInTheDocument()
    expect(screen.getByText('SurGlobal')).toBeInTheDocument()
  })

  it('warns about a link that is not a web address or a page of the site', () => {
    render(<BannersForm {...props} />)
    const [topLink] = screen.getAllByLabelText(/Link — where a click goes/)
    fireEvent.change(topLink, { target: { value: 'javascript:alert(1)' } })
    expect(screen.getByText(/This address is not valid/)).toBeInTheDocument()
  })

  it('saves what was typed and confirms it', async () => {
    vi.mocked(saveHomeBanners).mockResolvedValue({ ok: true })
    render(<BannersForm {...props} />)
    const [topLink] = screen.getAllByLabelText(/Link — where a click goes/)
    fireEvent.change(topLink, { target: { value: 'https://brand.com/offer' } })
    fireEvent.click(screen.getAllByRole('button', { name: 'Save banners' })[0])
    await waitFor(() => expect(saveHomeBanners).toHaveBeenCalled())
    const sent = vi.mocked(saveHomeBanners).mock.calls[0][0] as any
    expect(sent.top.linkUrl).toBe('https://brand.com/offer')
    expect(sent.bottom.enabled).toBe(true)
    expect(await screen.findByText(/Saved\. The homepage is updated/)).toBeInTheDocument()
  })

  it('shows the error when saving fails', async () => {
    vi.mocked(saveHomeBanners).mockResolvedValue({ ok: false, error: 'permission denied' })
    render(<BannersForm {...props} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Save banners' })[0])
    expect(await screen.findByText('permission denied')).toBeInTheDocument()
  })

  it('stops showing the preview of a banner that is switched off', () => {
    render(<BannersForm {...props} />)
    fireEvent.click(screen.getAllByLabelText('Show this banner')[0])
    expect(screen.queryByText('Have a story?')).not.toBeInTheDocument()
    expect(screen.getByText(/switched off/)).toBeInTheDocument()
  })
})
