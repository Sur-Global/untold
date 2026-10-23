import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ShareButton } from '@/components/social/ShareButton'

const messages: Record<string, string> = { button: 'Compartir', dialog: 'Compartir en…', copyLink: 'Copiar enlace', copied: 'Enlace copiado', email: 'Correo', more: 'Más opciones', close: 'Cerrar' }
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => messages[key] ?? key }))

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Compartir' }))

describe('ShareButton', () => {
  afterEach(() => {
    document.head.innerHTML = ''
    Object.assign(navigator, { share: undefined })
    vi.restoreAllMocks()
  })

  it('opens a menu with the social networks, copy link and email, closed by default', () => {
    render(<ShareButton title="Un título" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    open()
    const dialog = screen.getByRole('dialog', { name: 'Compartir en…' })
    for (const name of ['WhatsApp', 'Facebook', 'X', 'LinkedIn', 'Telegram', 'Reddit', 'Threads', 'Bluesky', 'Correo']) {
      expect(within(dialog).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
  })

  it('shares the address of this page, in a new tab, without tracking parameters', () => {
    window.history.pushState({}, '', '/es/articles/x?utm_source=a#top')
    render(<ShareButton title="Un título" />)
    open()
    const facebook = screen.getByRole('link', { name: 'Facebook' })
    expect(facebook).toHaveAttribute('href', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/es/articles/x`)}`)
    expect(facebook).toHaveAttribute('target', '_blank')
    expect(facebook).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('offers Pinterest only when the page has a preview picture', () => {
    const { unmount } = render(<ShareButton title="t" />)
    open()
    expect(screen.queryByRole('link', { name: 'Pinterest' })).not.toBeInTheDocument()
    unmount()
    document.head.innerHTML = '<meta property="og:image" content="https://cdn/cover.webp">'
    render(<ShareButton title="t" />)
    open()
    expect(screen.getByRole('link', { name: 'Pinterest' }).getAttribute('href')).toContain(encodeURIComponent('https://cdn/cover.webp'))
  })

  it('copies the link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ShareButton title="t" />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(window.location.origin))
    expect(await screen.findByRole('button', { name: 'Enlace copiado' })).toBeInTheDocument()
  })

  it('shows "More options" (the phone’s own share sheet, with Instagram and TikTok) only where the device has one', () => {
    const { unmount } = render(<ShareButton title="t" />)
    open()
    expect(screen.queryByRole('button', { name: 'Más opciones' })).not.toBeInTheDocument()
    unmount()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share })
    render(<ShareButton title="Un título" />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Más opciones' }))
    expect(share).toHaveBeenCalledWith({ title: 'Un título', url: expect.stringContaining(window.location.origin) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes with Escape or a click outside', () => {
    render(<ShareButton title="t" />)
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    open()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
