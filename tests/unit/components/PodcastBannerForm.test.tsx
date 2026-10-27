import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PodcastBannerForm } from '@/components/admin/PodcastBannerForm'
import { DEFAULT_PODCAST_BANNER, PODCAST_PLATFORMS, PODCAST_PLATFORM_LABELS } from '@/lib/podcast-banner'
import { savePodcastBanner } from '@/lib/actions/podcast-banner'

vi.mock('@/lib/actions/podcast-banner', () => ({ savePodcastBanner: vi.fn() }))

const copy = { tagline: 'Un podcast por SurGlobal & UNTOLD.ink', listenOn: 'Escúchalo en', listenOnPlatform: 'Escuchar en {platform}' }

describe('PodcastBannerForm (Admin → Advertising)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('says where the banner appears and has a space for the link of every platform', () => {
    render(<PodcastBannerForm initial={DEFAULT_PODCAST_BANNER} copy={copy} />)
    expect(screen.getByText(/Banner 3/)).toBeInTheDocument()
    expect(screen.getByText(/just below the podcasts made by SurGlobal \/ UNTOLD\.ink/)).toBeInTheDocument()
    for (const platform of PODCAST_PLATFORMS) expect(screen.getByLabelText(PODCAST_PLATFORM_LABELS[platform])).toBeInTheDocument()
  })

  it('is switched off until it is turned on, and says so in the preview', () => {
    render(<PodcastBannerForm initial={DEFAULT_PODCAST_BANNER} copy={copy} />)
    expect(screen.getByRole('checkbox', { name: 'Show this banner' })).not.toBeChecked()
    expect(screen.getByText(/switched off, so the podcasts page shows nothing here/)).toBeInTheDocument()
  })

  it('previews the logos as links are typed', () => {
    render(<PodcastBannerForm initial={{ ...DEFAULT_PODCAST_BANNER, enabled: true }} copy={copy} />)
    expect(screen.queryByRole('link', { name: 'Escuchar en Spotify' })).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Spotify'), { target: { value: 'https://open.spotify.com/show/1' } })
    expect(screen.getByRole('link', { name: 'Escuchar en Spotify' })).toHaveAttribute('href', 'https://open.spotify.com/show/1')
  })

  it('warns about an address that is not a web address and does not preview it', () => {
    render(<PodcastBannerForm initial={{ ...DEFAULT_PODCAST_BANNER, enabled: true }} copy={copy} />)
    fireEvent.change(screen.getByLabelText('YouTube'), { target: { value: 'javascript:alert(1)' } })
    expect(screen.getByText(/This address is not valid/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Escuchar en YouTube' })).not.toBeInTheDocument()
  })

  it('saves what was typed and confirms it', async () => {
    vi.mocked(savePodcastBanner).mockResolvedValue({ ok: true })
    render(<PodcastBannerForm initial={DEFAULT_PODCAST_BANNER} copy={copy} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show this banner' }))
    fireEvent.change(screen.getByLabelText('Apple Podcasts'), { target: { value: 'https://podcasts.apple.com/x' } })
    fireEvent.change(screen.getByLabelText('Name 1'), { target: { value: 'iVoox' } })
    fireEvent.change(screen.getByLabelText('Link 1'), { target: { value: 'https://ivoox.com/x' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save podcast banner' }))
    await waitFor(() => expect(savePodcastBanner).toHaveBeenCalled())
    const sent = vi.mocked(savePodcastBanner).mock.calls[0][0] as any
    expect(sent.enabled).toBe(true)
    expect(sent.links.apple).toBe('https://podcasts.apple.com/x')
    expect(sent.others[0]).toEqual({ label: 'iVoox', url: 'https://ivoox.com/x' })
    expect(await screen.findByText(/Saved\. The podcasts page is updated/)).toBeInTheDocument()
  })

  it('shows the error when saving fails', async () => {
    vi.mocked(savePodcastBanner).mockResolvedValue({ ok: false, error: 'permission denied' })
    render(<PodcastBannerForm initial={DEFAULT_PODCAST_BANNER} copy={copy} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save podcast banner' }))
    expect(await screen.findByText('permission denied')).toBeInTheDocument()
  })
})
