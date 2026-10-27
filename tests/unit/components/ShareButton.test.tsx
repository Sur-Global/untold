import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ShareButton } from '@/components/social/ShareButton'

const messages: Record<string, string> = { button: 'Compartir', dialog: 'Compartir este contenido', copyLink: 'Copiar enlace', copied: 'Enlace copiado', email: 'Enviar por correo', copyFailed: 'No se pudo copiar. Copia el enlace desde aquí:', close: 'Cerrar' }
vi.mock('next-intl', () => ({ useLocale: () => 'es', useTranslations: () => (key: string) => messages[key] ?? key }))

const open = () => fireEvent.click(screen.getByRole('button', { name: 'Compartir' }))

describe('ShareButton', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    Object.assign(navigator, { clipboard: undefined })
    delete (document as any).execCommand
    document.body.innerHTML = ''
  })

  it('is closed by default and opens a panel with only two ways of sharing: copy the link and send it by email', () => {
    render(<ShareButton title="Un título" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    open()
    const dialog = screen.getByRole('dialog', { name: 'Compartir este contenido' })
    const rows = [...dialog.querySelectorAll('a, button')].map((el) => el.textContent?.trim()).filter((text) => text && text !== '✕')
    expect(rows).toEqual(['Copiar enlace', 'Enviar por correo'])
  })

  it('sends by email with the title as subject and the address of this page, without tracking parameters', () => {
    window.history.pushState({}, '', '/es/articles/x?utm_source=a#top')
    render(<ShareButton title="Un título" />)
    open()
    const email = screen.getByRole('link', { name: 'Enviar por correo' })
    expect(email).toHaveAttribute('href', `mailto:?subject=${encodeURIComponent('Un título')}&body=${encodeURIComponent(`${window.location.origin}/es/articles/x`)}`)
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

  it('when the browser does not let it copy, shows the link ready to copy by hand', async () => {
    Object.assign(navigator, { clipboard: undefined })
    ;(document as any).execCommand = vi.fn().mockReturnValue(false)
    window.history.pushState({}, '', '/es/articles/y')
    render(<ShareButton title="t" />)
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(await screen.findByText('No se pudo copiar. Copia el enlace desde aquí:')).toBeInTheDocument()
    const box = within(screen.getByRole('dialog')).getByDisplayValue(`${window.location.origin}/es/articles/y`)
    expect(box).toHaveAttribute('readonly')
  })

  it('has no social networks, no Instagram and no phone share sheet any more', () => {
    Object.assign(navigator, { share: vi.fn() })
    render(<ShareButton title="t" />)
    open()
    for (const name of ['Bluesky', 'LinkedIn', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Instagram', 'Más opciones', 'Descargar láminas']) {
      expect(screen.queryByText(name)).not.toBeInTheDocument()
    }
    Object.assign(navigator, { share: undefined })
  })

  it('closes with Escape, a click outside, or choosing to send by email', () => {
    render(<ShareButton title="t" />)
    open()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    open()
    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    open()
    fireEvent.click(screen.getByRole('link', { name: 'Enviar por correo' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
