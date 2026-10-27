import { render, screen, within } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { PodcastBanner } from '@/components/podcasts/PodcastBanner'
import { PODCAST_NAME, normalizePodcastBanner } from '@/lib/podcast-banner'

const copy = { tagline: 'Un podcast por SurGlobal & UNTOLD.ink', listenOn: 'Escúchalo en', listenOnPlatform: 'Escuchar en {platform}' }
const on = (extra: object = {}) => normalizePodcastBanner({ enabled: true, ...extra })

describe('PodcastBanner', () => {
  it('shows nothing while it is switched off', () => {
    const { container } = render(<PodcastBanner banner={normalizePodcastBanner({ links: { spotify: 'https://open.spotify.com/show/1' } })} copy={copy} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('without a picture it shows a design in the brand colour with the name and “a podcast by SurGlobal & UNTOLD.ink”', () => {
    render(<PodcastBanner banner={on()} copy={copy} />)
    expect(screen.getByText(PODCAST_NAME)).toBeInTheDocument()
    expect(screen.getByText('Un podcast por SurGlobal & UNTOLD.ink')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('with a picture it shows it (and the phone version), described for people who cannot see it', () => {
    const { container } = render(<PodcastBanner banner={on({ imageUrl: 'https://cdn/podcast.webp', mobileImageUrl: 'https://cdn/podcast-m.webp', altText: 'Portada del podcast' })} copy={copy} />)
    expect(screen.getByRole('img', { name: 'Portada del podcast' })).toHaveAttribute('src', 'https://cdn/podcast.webp')
    expect(container.querySelector('source')).toHaveAttribute('srcset', 'https://cdn/podcast-m.webp')
    expect(screen.queryByText(PODCAST_NAME)).not.toBeInTheDocument()
  })

  it('a picture with no description is described with the name of the podcast', () => {
    render(<PodcastBanner banner={on({ imageUrl: 'https://cdn/podcast.webp' })} copy={copy} />)
    expect(screen.getByRole('img')).toHaveAttribute('alt', `${PODCAST_NAME} — Un podcast por SurGlobal & UNTOLD.ink`)
  })

  it('shows the logo of each platform that has a link, each one clickable (new tab), and none of the others', () => {
    render(
      <PodcastBanner
        banner={on({ links: { spotify: 'https://open.spotify.com/show/1', apple: 'https://podcasts.apple.com/x', youtube: 'https://youtube.com/@x' } })}
        copy={copy}
      />,
    )
    expect(screen.getByText('Escúchalo en')).toBeInTheDocument()
    const list = screen.getByRole('list')
    const links = within(list).getAllByRole('link')
    expect(links.map((a) => a.getAttribute('aria-label'))).toEqual(['Escuchar en Spotify', 'Escuchar en Apple Podcasts', 'Escuchar en YouTube'])
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://open.spotify.com/show/1', 'https://podcasts.apple.com/x', 'https://youtube.com/@x'])
    for (const a of links) {
      expect(a).toHaveAttribute('target', '_blank')
      expect(a).toHaveAttribute('rel', 'noopener noreferrer')
      expect(a.querySelector('svg')).toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: /Deezer/ })).not.toBeInTheDocument()
  })

  it('shows other platforms with their name', () => {
    render(<PodcastBanner banner={on({ others: [{ label: 'iVoox', url: 'https://ivoox.com/x' }] })} copy={copy} />)
    const link = screen.getByRole('link', { name: 'Escuchar en iVoox' })
    expect(link).toHaveTextContent('iVoox')
    expect(link).toHaveAttribute('href', 'https://ivoox.com/x')
  })

  it('never makes a link of an unsafe address', () => {
    render(<PodcastBanner banner={on({ links: { spotify: 'javascript:alert(1)' } })} copy={copy} />)
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
