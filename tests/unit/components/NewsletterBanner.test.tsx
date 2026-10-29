import { render, screen } from '@testing-library/react'
import { beforeEach, describe, it, expect, vi } from 'vitest'
import es from '@/messages/es.json'
import en from '@/messages/en.json'
import pt from '@/messages/pt.json'
import fr from '@/messages/fr.json'
import de from '@/messages/de.json'
import da from '@/messages/da.json'

const subscribe: Record<string, string> = {
  eyebrow: 'Boletín',
  bannerTitle: 'Enciende tu <hl>curiosidad</hl>, transforma el futuro',
  subtitle: 'Ideas y voces del Sur en tu correo. Gratis y sin spam.',
  privacy: 'Respetamos tu privacidad.',
}
const footer: Record<string, string> = { subscribeCta: 'Suscríbete', subscribeClose: 'Cerrar', subscribeFormTitle: 'Formulario de suscripción' }

vi.mock('next-intl/server', () => ({
  getTranslations: async (ns: string) => {
    const table = ns === 'subscribe' ? subscribe : footer
    const t = (key: string) => table[key] ?? key
    t.rich = (key: string, tags: Record<string, (chunks: string) => React.ReactNode>) => {
      const [, before, inner, after] = table[key].match(/^(.*)<hl>(.*)<\/hl>(.*)$/)!
      return <>{before}{tags.hl(inner)}{after}</>
    }
    return t
  },
}))

const sender = vi.hoisted(() => ({ configured: false }))
vi.mock('@/lib/sender', () => ({ isSenderConfigured: () => sender.configured }))
vi.mock('@/components/layout/SubscribeForm', () => ({ SubscribeForm: ({ variant }: { variant?: string }) => <div data-testid="form" data-variant={variant} /> }))
vi.mock('@/components/layout/SubscribeModalButton', () => ({
  SubscribeModalButton: (p: { label: string; closeLabel: string; formTitle: string }) => <button data-testid="modal-button" data-close={p.closeLabel} data-title={p.formTitle}>{p.label}</button>,
}))

import { NewsletterBanner } from '@/components/layout/NewsletterBanner'

beforeEach(() => { sender.configured = false })

describe('NewsletterBanner', () => {
  it('is a region named by its title, with the eyebrow, the title with one lime word and the subtitle', async () => {
    render(await NewsletterBanner())
    const region = screen.getByRole('region', { name: 'Enciende tu curiosidad, transforma el futuro' })
    expect(region).toBeInTheDocument()
    expect(screen.getByText('Boletín')).toBeInTheDocument()
    const lime = screen.getByText('curiosidad')
    expect(lime).toHaveStyle({ color: '#D2FE73' })
    expect(lime.closest('h2')).not.toBeNull()
  })

  it('says "Sur", not "Sur Global", in the subtitle', async () => {
    render(await NewsletterBanner())
    expect(screen.getByText(/Ideas y voces del Sur en tu correo/)).toBeInTheDocument()
    expect(screen.queryByText(/Sur Global/)).toBeNull()
  })

  it('with Sender connected: our own sign-up form, the banner version', async () => {
    sender.configured = true
    render(await NewsletterBanner())
    expect(screen.getByTestId('form')).toHaveAttribute('data-variant', 'banner')
    expect(screen.queryByTestId('modal-button')).toBeNull()
  })

  it('without Sender connected: a button that opens Sender\'s form, with the privacy line next to it, so people can already subscribe', async () => {
    render(await NewsletterBanner())
    expect(screen.queryByTestId('form')).toBeNull()
    const button = screen.getByTestId('modal-button')
    expect(button).toHaveTextContent('Suscríbete')
    expect(button).toHaveAttribute('data-close', 'Cerrar')
    expect(button).toHaveAttribute('data-title', 'Formulario de suscripción')
    expect(screen.getByText('Respetamos tu privacidad.')).toBeInTheDocument()
  })

  it('has a gap above, or none when the page ends in a full-width band', async () => {
    const { container, unmount } = render(await NewsletterBanner())
    expect(container.querySelector('section')!.className).toContain('mt-20')
    unmount()
    const flush = render(await NewsletterBanner({ flushTop: true }))
    expect(flush.container.querySelector('section')!.className).not.toContain('mt-20')
  })

  it('the arrow is decoration: hidden from screen readers', async () => {
    const { container } = render(await NewsletterBanner())
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('banner texts in the six languages', () => {
  const all = { es, en, pt, fr, de, da } as Record<string, { subscribe: Record<string, string> }>

  for (const [locale, messages] of Object.entries(all)) {
    it(`${locale}: the title marks exactly one word to highlight`, () => {
      const title = messages.subscribe.bannerTitle
      expect(title.match(/<hl>[^<]+<\/hl>/g)).toHaveLength(1)
      expect(title.replace(/<\/?hl>/g, '')).toBe(messages.subscribe.title)
    })
  }

  it('the subtitle says South, not Global South, in every language', () => {
    for (const messages of Object.values(all)) {
      expect(messages.subscribe.subtitle).not.toMatch(/Global|Globale|global/)
    }
  })
})
