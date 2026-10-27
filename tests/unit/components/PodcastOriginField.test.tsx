import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PodcastOriginField } from '@/components/content/PodcastOriginField'
import { CreatePodcastForm } from '@/app/[locale]/create/podcast/CreatePodcastForm'
import es from '@/messages/es.json'

// the Spanish texts of the interface, as they read
const text = (namespace: 'editor' | 'listings' | 'dashboard') => (key: string) => (es[namespace] as Record<string, string>)[key] ?? key
vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: (namespace: 'editor' | 'listings' | 'dashboard') => text(namespace),
}))
vi.mock('@/lib/actions/podcast', () => ({ createPodcast: vi.fn() }))
// parts of the form that are not what is tested here
vi.mock('@/components/content/AuthorPicker', () => ({ AuthorPicker: () => null }))
vi.mock('@/components/content/ContentLanguageSelect', () => ({ ContentLanguageSelect: () => null }))
vi.mock('@/components/content/LanguageAvailabilityFields', () => ({ LanguageAvailabilityFields: () => null }))
vi.mock('@/components/ui/CoverImageInput', () => ({ CoverImageInput: () => null }))

const options = () => screen.getAllByRole('radio').map((radio) => (radio.closest('label') as HTMLElement).textContent)

describe('PodcastOriginField', () => {
  it('offers the four types in order, none chosen, and says one is needed', () => {
    render(<PodcastOriginField />)
    const group = screen.getByRole('group', { name: /Tipo de podcast/ })
    expect(within(group).getAllByRole('radio')).toHaveLength(4)
    expect(options()).toEqual([
      'Creados por SurGlobal / UNTOLD.ink',
      'Terceros en colaboración con SurGlobal / UNTOLD.ink',
      'Terceros que entrevistan a SurGlobal / UNTOLD.ink',
      'Podcasts de terceros',
    ])
    for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
    expect(screen.getByText('Elige el tipo de podcast para poder publicar.')).toBeInTheDocument()
  })

  it('sends the chosen type with the form and tells the form', () => {
    const onChange = vi.fn()
    const { container } = render(<form><PodcastOriginField onChange={onChange} /></form>)
    fireEvent.click(screen.getByRole('radio', { name: 'Terceros que entrevistan a SurGlobal / UNTOLD.ink' }))
    expect(onChange).toHaveBeenCalledWith('guest')
    expect(new FormData(container.querySelector('form')!).get('origin')).toBe('guest')
    expect(screen.queryByText('Elige el tipo de podcast para poder publicar.')).not.toBeInTheDocument()
  })

  it('shows the type already saved', () => {
    render(<PodcastOriginField defaultValue="own" />)
    expect(screen.getByRole('radio', { name: 'Creados por SurGlobal / UNTOLD.ink' })).toBeChecked()
  })
})

describe('creating a podcast: the type is needed to publish', () => {
  const publish = () => screen.getByRole('button', { name: es.dashboard.publish })
  const confirmResponsibility = () => fireEvent.click(screen.getByRole('checkbox', { name: es.editor.responsibilityText }))

  it('an admin or editor cannot publish until they choose one (a draft can be saved)', () => {
    render(<CreatePodcastForm canChooseOrigin />)
    confirmResponsibility()
    expect(publish()).toBeDisabled()
    expect(screen.getByRole('button', { name: es.dashboard.saveAsDraft })).toBeEnabled()
    fireEvent.click(screen.getByRole('radio', { name: 'Creados por SurGlobal / UNTOLD.ink' }))
    expect(publish()).toBeEnabled()
  })

  it('anyone else does not see the choice, and is not held back by it', () => {
    render(<CreatePodcastForm />)
    expect(screen.queryByRole('group', { name: /Tipo de podcast/ })).not.toBeInTheDocument()
    expect(screen.queryAllByRole('radio')).toHaveLength(0)
    confirmResponsibility()
    expect(publish()).toBeEnabled()
  })

  it('everyone can ask for their podcast to be featured', () => {
    render(<CreatePodcastForm />)
    expect(screen.getByText(es.editor.featureRequestTitle)).toBeInTheDocument()
  })
})
