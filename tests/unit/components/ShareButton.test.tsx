import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ShareButton } from '@/components/social/ShareButton'

const messages: Record<string, string> = { button: 'Compartir', dialog: 'Compartir en…', copyLink: 'Copiar enlace', copied: 'Enlace copiado', email: 'Correo', more: 'Más opciones', close: 'Cerrar', downloadSlides: 'Descargar láminas', preparingSlides: 'Preparando láminas…', instagramSlidesHint: 'Descargamos las láminas. Súbelas a Instagram.', slidesError: 'No se pudieron preparar las láminas.' }
vi.mock('next-intl', () => ({ useLocale: () => 'es', useTranslations: () => (key: string) => messages[key] ?? key }))
const slideDownload = vi.hoisted(() => ({ downloadSlidesZip: vi.fn().mockResolvedValue(undefined), fetchSlideFiles: vi.fn(), canSharePictures: vi.fn().mockReturnValue(false) }))
vi.mock('@/lib/slide-download', () => slideDownload)

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
    for (const name of ['Bluesky', 'LinkedIn', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Correo']) {
      expect(within(dialog).getByRole('link', { name })).toBeInTheDocument()
    }
    expect(within(dialog).queryByRole('button', { name: 'Instagram' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
  })

  it('shows the networks in the chosen order: Bluesky, LinkedIn, WhatsApp, Facebook, Telegram, Reddit, Threads, X, email, copy link (no Instagram: there are no pictures to share)', () => {
    render(<ShareButton title="Un título" />)
    open()
    const dialog = screen.getByRole('dialog')
    const names = [...dialog.querySelectorAll('a, button')].map((el) => el.textContent?.trim()).filter((n) => n && n !== '✕')
    expect(names).toEqual(['Bluesky', 'LinkedIn', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Correo', 'Copiar enlace'])
  })

  it('a carousel pill adds Instagram (between LinkedIn and WhatsApp) and the download of its slides', () => {
    render(<ShareButton title="Un título" slides={{ slug: 'crisis', count: 4 }} />)
    open()
    const dialog = screen.getByRole('dialog')
    const names = [...dialog.querySelectorAll('a, button')].map((el) => el.textContent?.trim()).filter((n) => n && n !== '✕')
    expect(names).toEqual(['Bluesky', 'LinkedIn', 'Instagram', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Correo', 'Copiar enlace', 'Descargar láminas'])
  })

  it('downloads the slides from the menu, and Instagram on a computer downloads them too and says to upload them', async () => {
    render(<ShareButton title="Un título" slides={{ slug: 'crisis', count: 4 }} />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Descargar láminas' }))
    await vi.waitFor(() => expect(slideDownload.downloadSlidesZip).toHaveBeenCalledWith('crisis', 'es'))
    await vi.waitFor(() => expect(screen.getByRole('button', { name: 'Instagram' })).not.toBeDisabled())
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    expect(await screen.findByText('Descargamos las láminas. Súbelas a Instagram.')).toBeInTheDocument()
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
