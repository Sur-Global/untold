import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { ShareBar } from '@/components/social/ShareBar'

const messages: Record<string, string> = {
  dialog: 'Compartir en…', copyLink: 'Copiar enlace', copied: 'Enlace copiado', email: 'Correo',
  downloadSlides: 'Descargar láminas', preparingSlides: 'Preparando láminas…', instagramSlidesHint: 'Descargamos las láminas. Súbelas a Instagram.',
  slidesReady: 'Láminas listas: pulsa otra vez.', slidesError: 'No se pudieron preparar las láminas.',
}
vi.mock('next-intl', () => ({ useLocale: () => 'es', useTranslations: () => (key: string) => messages[key] ?? key }))

const slideDownload = vi.hoisted(() => ({
  downloadSlidesZip: vi.fn(),
  fetchSlideFiles: vi.fn(),
  canSharePictures: vi.fn(),
}))
vi.mock('@/lib/slide-download', () => slideDownload)

const url = 'https://untold-six.vercel.app/es/pills/crisis-climatica?utm_source=x'
const slides = { slug: 'crisis-climatica', count: 3 }

describe('ShareBar (every way of sharing, always visible)', () => {
  beforeEach(() => { vi.clearAllMocks(); slideDownload.canSharePictures.mockReturnValue(false) })
  afterEach(() => { vi.restoreAllMocks(); Object.assign(navigator, { share: undefined }) })

  it('shows all the networks at once, in the chosen order, with email and copy link — and no Instagram where there are no pictures to share', () => {
    render(<ShareBar title="Crisis climática" url={url} />)
    const names = screen.getAllByRole('link').map((a) => a.getAttribute('aria-label'))
    expect(names).toEqual(['Bluesky', 'LinkedIn', 'WhatsApp', 'Facebook', 'Telegram', 'Reddit', 'Threads', 'X', 'Correo'])
    expect(screen.queryByRole('button', { name: 'Instagram' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Descargar láminas' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Copiar enlace' })).toBeInTheDocument()
  })

  it('a carousel also has Instagram, between LinkedIn and WhatsApp, and the download of its slides', () => {
    render(<ShareBar title="Crisis climática" url={url} slides={slides} />)
    const names = [...document.querySelectorAll('a[aria-label], button[aria-label]')].map((el) => el.getAttribute('aria-label'))
    expect(names.slice(0, 4)).toEqual(['Bluesky', 'LinkedIn', 'Instagram', 'WhatsApp'])
    expect(screen.getByRole('button', { name: 'Descargar láminas' })).toBeInTheDocument()
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

  it('downloads the slides (a ZIP) in the language of the page', async () => {
    slideDownload.downloadSlidesZip.mockResolvedValue(undefined)
    render(<ShareBar title="t" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar láminas' }))
    await waitFor(() => expect(slideDownload.downloadSlidesZip).toHaveBeenCalledWith('crisis-climatica', 'es'))
  })

  it('says so when the slides cannot be prepared', async () => {
    slideDownload.downloadSlidesZip.mockRejectedValue(new Error('500'))
    render(<ShareBar title="t" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Descargar láminas' }))
    expect(await screen.findByRole('status')).toHaveTextContent('No se pudieron preparar las láminas.')
  })

  it('Instagram on a computer downloads the slides and says to upload them', async () => {
    slideDownload.downloadSlidesZip.mockResolvedValue(undefined)
    render(<ShareBar title="t" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Descargamos las láminas. Súbelas a Instagram.')
    expect(slideDownload.downloadSlidesZip).toHaveBeenCalledWith('crisis-climatica', 'es')
  })

  it('Instagram on a phone opens the phone’s share sheet with the slides as pictures', async () => {
    const files = [new File(['a'], 'a.jpg'), new File(['b'], 'b.jpg')]
    slideDownload.canSharePictures.mockReturnValue(true)
    slideDownload.fetchSlideFiles.mockResolvedValue(files)
    const share = vi.fn().mockResolvedValue(undefined)
    Object.assign(navigator, { share })
    render(<ShareBar title="Crisis climática" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    await waitFor(() => expect(share).toHaveBeenCalledWith({ files, title: 'Crisis climática' }))
    expect(slideDownload.fetchSlideFiles).toHaveBeenCalledWith('crisis-climatica', 'es', 3)
    expect(slideDownload.downloadSlidesZip).not.toHaveBeenCalled()
  })

  it('if the phone refuses the share sheet after the wait, the slides are kept and the next tap shares them at once', async () => {
    const files = [new File(['a'], 'a.jpg')]
    slideDownload.canSharePictures.mockReturnValue(true)
    slideDownload.fetchSlideFiles.mockResolvedValue(files)
    const share = vi.fn().mockRejectedValueOnce(Object.assign(new Error('x'), { name: 'NotAllowedError' })).mockResolvedValue(undefined)
    Object.assign(navigator, { share })
    render(<ShareBar title="t" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Láminas listas: pulsa otra vez.')
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    await waitFor(() => expect(share).toHaveBeenCalledTimes(2))
    expect(slideDownload.fetchSlideFiles).toHaveBeenCalledTimes(1)
  })

  it('closing the phone’s share sheet is not an error', async () => {
    slideDownload.canSharePictures.mockReturnValue(true)
    slideDownload.fetchSlideFiles.mockResolvedValue([new File(['a'], 'a.jpg')])
    const share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' }))
    Object.assign(navigator, { share })
    render(<ShareBar title="t" url={url} slides={slides} />)
    fireEvent.click(screen.getByRole('button', { name: 'Instagram' }))
    await waitFor(() => expect(share).toHaveBeenCalled())
    expect(screen.queryByRole('status')).toBeNull()
  })
})
