import { act, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'
import { CourseView, type CourseViewProps } from '@/components/courses/CourseView'

const base: CourseViewProps = {
  heading: 'Las Esferas de la Innovación',
  subtitle: null,
  bannerImage: null,
  providerName: '',
  providerUrl: '',
  facts: [],
  actions: null,
  audience: '',
  people: [],
  content: <p>Descripción</p>,
  registration: {
    note: 'Una sesión gratuita',
    sessions: [{ day: 'lunes 3 de noviembre', time: '18:00', status: 'open' }],
    timezone: 'Hora de Lima',
    href: 'https://forms.example/curso',
    embedUrl: null,
    label: 'Inscribirme',
  },
  tags: null,
  price: '$180',
  priceNote: 'Pago en dos cuotas',
  labels: {
    facts: 'Datos', provider: 'Imparte', instructor: 'Docente', price: 'Precio', free: 'Gratis', intro: 'Sesiones informativas', audience: 'Para quién',
    people: 'Docentes', groups: { teacher: 'Docentes', facilitator: 'Facilitadores' }, viewProfile: 'Ver perfil',
    status: { open: 'Abierta', few: 'Últimas plazas', full: 'Agotada' },
    formTitle: 'Formulario', openForm: 'Abrir', noForm: 'Pronto', enrollSoon: 'Próximamente', enrollSoonTitle: 'Aún no', rating: 'Valoración',
  },
}

/** A stand-in for the browser's IntersectionObserver that the test moves by hand */
let observers: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit; observed: Element[] }[] = []

beforeEach(() => {
  observers = []
  vi.stubGlobal('IntersectionObserver', class {
    entry = { callback: undefined as unknown as IntersectionObserverCallback, options: undefined as IntersectionObserverInit | undefined, observed: [] as Element[] }
    constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
      this.entry.callback = callback
      this.entry.options = options
      observers.push(this.entry)
    }
    observe(el: Element) { this.entry.observed.push(el) }
    disconnect() { this.entry.observed = [] }
    unobserve() {}
    takeRecords() { return [] }
  })
})

afterEach(() => vi.unstubAllGlobals())

/** Moves the registration box: below the screen, on it, or already above it */
function moveBox(where: 'below' | 'on' | 'above') {
  const top = where === 'below' ? 900 : where === 'on' ? 300 : -1200
  act(() => {
    for (const o of observers) o.callback([{ isIntersecting: where === 'on', boundingClientRect: { top } } as IntersectionObserverEntry], {} as IntersectionObserver)
  })
}

const bar = () => screen.getByTestId('course-register-bar')
/** the button in the card at the side (not the one in the bar and not the one in the box of the page) */
const cardButtons = () => within(screen.getByRole('complementary')).queryAllByRole('link', { name: /Inscribirme/ })
const boxButton = () => document.getElementById('inscripcion')!.querySelector('a')

describe('CourseSidebar: one registration button on screen at a time', () => {
  it('watches the registration box of the page', () => {
    render(<CourseView {...base} />)
    expect(observers).toHaveLength(1)
    expect(observers[0].observed[0]).toBe(document.getElementById('inscripcion'))
  })

  it('before the box: the bar is there with the price and the button, and the card has its button', () => {
    render(<CourseView {...base} />)
    expect(bar()).not.toHaveAttribute('inert')
    expect(bar()).toHaveTextContent('$180')
    expect(bar()).toHaveTextContent('Pago en dos cuotas')
    expect(bar().querySelector('a')).toHaveAttribute('href', 'https://forms.example/curso')
    expect(cardButtons()).toHaveLength(1)
  })

  it('while the box is on screen: the card lets go of its button and the bar goes away, so only the box button is left', () => {
    render(<CourseView {...base} />)
    moveBox('on')
    expect(bar()).toHaveAttribute('inert')
    expect(bar().className).toContain('translate-y-full')
    expect(cardButtons()).toHaveLength(0)
    expect(boxButton()).toHaveTextContent('Inscribirme')
  })

  it('after passing the box: the bar stays away (it would cover the footer) and the card gets its button back', () => {
    render(<CourseView {...base} />)
    moveBox('on')
    moveBox('above')
    expect(bar()).toHaveAttribute('inert')
    expect(cardButtons()).toHaveLength(1)
  })

  it('scrolling back up above the box brings the bar back', () => {
    render(<CourseView {...base} />)
    moveBox('on')
    moveBox('below')
    expect(bar()).not.toHaveAttribute('inert')
    expect(cardButtons()).toHaveLength(1)
  })

  it('with the form inside the page both buttons take the reader to it; with an outside form they open it in a new tab', () => {
    const { unmount } = render(<CourseView {...base} registration={{ ...base.registration, embedUrl: 'https://forms.example/embed' }} />)
    expect(bar().querySelector('a')).toHaveAttribute('href', '#inscripcion')
    expect(cardButtons()[0]).toHaveAttribute('href', '#inscripcion')
    unmount()
    render(<CourseView {...base} />)
    expect(bar().querySelector('a')).toHaveAttribute('target', '_blank')
    expect(cardButtons()[0]).toHaveAttribute('target', '_blank')
  })

  it('on a phone the card does not repeat the sessions or the button; on a computer it keeps both', () => {
    render(<CourseView {...base} />)
    const card = screen.getByRole('complementary')
    expect(card.querySelector('ul')!.closest('div.hidden')).toHaveClass('lg:block')
    expect(cardButtons()[0].parentElement).toHaveClass('hidden', 'lg:block')
  })

  it('a free course shows "Gratis" in the bar', () => {
    render(<CourseView {...base} price={null} priceNote="" />)
    expect(bar()).toHaveTextContent('Gratis')
  })

  it('without a form to go to there is no bar, and the card keeps its "coming soon" button on every screen', () => {
    render(<CourseView {...base} registration={{ ...base.registration, href: null }} />)
    expect(screen.queryByTestId('course-register-bar')).toBeNull()
    const soon = screen.getByRole('button', { name: 'Próximamente' })
    expect(soon.parentElement).not.toHaveClass('hidden')
    moveBox('on')
    expect(screen.getByRole('button', { name: 'Próximamente' })).toBeInTheDocument()
  })

  it('a browser without IntersectionObserver still shows the page, with the bar until it knows better', () => {
    vi.unstubAllGlobals()
    render(<CourseView {...base} />)
    expect(bar()).not.toHaveAttribute('inert')
  })
})
