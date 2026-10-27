import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CourseView, type CourseViewProps } from '@/components/courses/CourseView'

const base: CourseViewProps = {
  heading: 'Las Esferas de la Innovación',
  subtitle: 'Cuatro esferas para rediseñar tu oficio',
  bannerImage: null,
  providerName: 'Escuela Breve de SurGlobal',
  providerUrl: 'https://surglobal.io',
  facts: [],
  actions: null,
  audience: '',
  people: [],
  content: <p>Descripción</p>,
  registration: { note: '', sessions: [], timezone: '', href: null, embedUrl: null, label: 'Inscribirme' },
  tags: null,
  price: null,
  priceNote: '',
  labels: {
    facts: 'Datos', provider: 'Imparte', instructor: 'Docente', price: 'Precio', free: 'Gratis', intro: 'Sesiones introductorias', audience: 'Para quién',
    people: 'Docentes', groups: { teacher: 'Docentes', facilitator: 'Facilitadores' }, viewProfile: 'Ver perfil',
    status: { open: 'Abierta', few: 'Últimas plazas', full: 'Agotada' },
    formTitle: 'Formulario', openForm: 'Abrir', noForm: 'Pronto', enrollSoon: 'Próximamente', enrollSoonTitle: 'Aún no', rating: 'Valoración',
  },
}

const header = (container: HTMLElement) => container.querySelector('header') as HTMLElement

describe('CourseView header', () => {
  it('with a picture: the picture alone, whole and without a filter, and the provider, title and subtitle below it', () => {
    const { container } = render(<CourseView {...base} bannerImage="https://cdn/banner.webp" />)
    const img = header(container).querySelector('img') as HTMLImageElement
    expect(img).toHaveAttribute('src', 'https://cdn/banner.webp')
    expect(img.className).toContain('object-contain')
    expect(img.parentElement!.children).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('sr-only')
    expect(screen.getByText('Cuatro esferas para rediseñar tu oficio')).not.toHaveClass('sr-only')
    expect(screen.getByText(/Imparte:/)).toBeInTheDocument()
  })

  it('with a picture that already carries the title: the title and subtitle are not repeated on screen, but stay for search engines and screen readers', () => {
    render(<CourseView {...base} bannerImage="https://cdn/banner.webp" bannerHasTitle />)
    expect(screen.getByRole('heading', { level: 1, name: 'Las Esferas de la Innovación' })).toHaveClass('sr-only')
    expect(screen.getByText('Cuatro esferas para rediseñar tu oficio')).toHaveClass('sr-only')
    expect(screen.getByText(/Imparte:/)).not.toHaveClass('sr-only')
  })

  it('without a picture: only text on the page, no block of colour and no picture', () => {
    const { container } = render(<CourseView {...base} />)
    const head = header(container)
    expect(head.querySelector('img')).toBeNull()
    expect(head.getAttribute('style')).toBeNull()
    expect(head.className).not.toContain('rounded')
    expect(screen.getByRole('heading', { level: 1, name: 'Las Esferas de la Innovación' })).not.toHaveClass('sr-only')
    expect(screen.getByText('Cuatro esferas para rediseñar tu oficio')).toBeInTheDocument()
  })

  it('without a picture, "the picture has the title" changes nothing: there is no picture to carry it', () => {
    render(<CourseView {...base} bannerHasTitle />)
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveClass('sr-only')
  })
})
