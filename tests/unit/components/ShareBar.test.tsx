import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ShareBar } from '@/components/social/ShareBar'

const messages: Record<string, string> = { dialog: 'Compartir en…', copyLink: 'Copiar enlace', copied: 'Enlace copiado', email: 'Correo', instagramHint: 'Enlace copiado. Pégalo en Instagram.' }
vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => messages[key] ?? key }))

const url = 'https://untold-six.vercel.app/es/pills/crisis-climatica?utm_source=x'

describe('ShareBar (every way of sharing, always visible)', () => {
  afterEach(() => { vi.restoreAllMocks(); Object.assign(navigator, { share: undefined }) })

  it('shows all the networks at once, in the chosen order, with email and copy link', () => {
    render(<ShareBar title="Crisis climática" url={url} />)
    const names = screen.getAllByRole('link').map((a) => a.getAttribute('aria-label'))
    expect(names).toEqual(['Bluesky', 'LinkedIn', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Correo'])
    expect(screen.getByRole('button', { name: 'Instagram' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
  })

  it('shares the page without tracking parameters, in a new tab', () => {
    render(<ShareBar title="Crisis climática" url={url} />)
    const facebook = screen.getByRole('link', { name: 'Facebook' })
    expect(facebook).toHaveAttribute('href', `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://untold-six.vercel.app/es/pills/crisis-climatica')}`)
    expect(facebook).toHaveAttribute('target', '_blank')
  })

  it('copies the link and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    render(<ShareBar title="t" url={url} />)
    fireEvent.click(screen.getByRole('button', { name: 'Copiar enlace' }))
    expect(writeText).toHaveBeenCalledWith('https://untold-six.vercel.app/es/pills/crisis-climatica')
    expect(await screen.findByRole('status')).toHaveTextContent('Enlace copiado')
  })

  it('Instagram on a computer opens Instagram and copies the link', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { clipboard: { writeText } })
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    render(<ShareBar title="t" url={url} />)
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    expect(open).toHaveBeenCalledWith('https://www.instagram.com/', '_blank', 'noopener,noreferrer')
    expect(await screen.findByRole('status')).toHaveTextContent('Pégalo en Instagram')
  })
})
