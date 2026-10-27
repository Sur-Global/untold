import { fireEvent, render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CourseDetailsFields, CoursePeopleFields, CourseRegistrationFields, EMPTY_COURSE_FORM, type CourseFormInitial } from '@/components/courses/CourseFormFields'
import { readCourseExtras } from '@/lib/course-page'
import es from '@/messages/es.json'

const lookup = (namespace: 'editor' | 'coursePage') => (key: string, values?: Record<string, unknown>) => {
  const text = (es[namespace] as Record<string, string>)[key] ?? key
  return text.replace(/\{(\w+)\}/g, (_, name) => String(values?.[name] ?? ''))
}
vi.mock('next-intl', () => ({ useTranslations: (namespace: 'editor' | 'coursePage') => lookup(namespace), useLocale: () => 'es' }))
vi.mock('@/components/ui/CoverImageInput', () => ({ CoverImageInput: ({ name, defaultValue }: any) => <input type="hidden" name={name} defaultValue={defaultValue ?? ''} /> }))

const filled: CourseFormInitial = {
  ...EMPTY_COURSE_FORM,
  subtitle: 'Aprende a llevar la prospectiva a la estrategia', bannerUrl: 'https://cdn/banner.webp', providerName: 'Escuela breve de SurGlobal', providerUrl: 'https://surglobal.io/escuela',
  modality: 'hybrid', level: 'introductory', place: 'Bogotá', startsOn: '2027-03-12', duration: '6 semanas', languageLabel: 'Español', certificate: true, price: 180, currency: 'USD', priceNote: 'Becas disponibles',
  audience: 'Personas que lideran equipos\nEstudiantes avanzados',
  registrationMode: 'embed', registrationUrl: 'https://tally.so/r/abc', registrationLabel: 'Inscribirme', registrationNote: 'Para las sesiones introductorias',
  introSessions: [{ date: '2027-02-11', time: '18:00', status: 'few' }, { date: '2027-02-18', time: '', status: 'open' }], introTimezone: 'Hora de Bogotá (GMT-5)',
}

/** What the form would send: every named field of the rendered boxes */
const send = (container: HTMLElement) => {
  const form = document.createElement('form')
  form.append(...[...container.children].map((el) => el.cloneNode(true)))
  const fd = new FormData(form)
  // cloneNode does not keep what was typed or chosen: copy it
  container.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('input, select, textarea').forEach((el) => {
    if (!el.name) return
    if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) {
      if (el.type === 'checkbox') { fd.delete(el.name); if (el.checked) fd.set(el.name, 'on') } else if (el.checked) fd.set(el.name, el.value)
    } else fd.set(el.name, el.value)
  })
  return fd
}

describe('course form fields', () => {
  it('ask who gives the course (and its link), who the course is for, the key facts and the price with its note', () => {
    render(<><CourseDetailsFields /><CourseRegistrationFields /></>)
    expect(screen.getByLabelText('Quién imparte el curso')).toHaveAttribute('placeholder', 'Escuela breve de SurGlobal')
    expect(screen.getByLabelText('Enlace de quien imparte el curso')).toHaveAttribute('type', 'url')
    expect(screen.getByLabelText('¿Para quién está dirigido el curso?')).toBeInTheDocument()
    for (const label of ['Subtítulo', 'Modalidad', 'Nivel', 'Lugar o plataforma', 'Inicio de las clases', 'Idioma del curso', 'Nota sobre el precio', 'El curso da certificado']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('the registration has room for two introductory sessions, a form link and how it is shown (button or inside the page)', () => {
    render(<CourseRegistrationFields />)
    expect(screen.getByText('Inscripción a las sesiones introductorias')).toBeInTheDocument()
    expect(screen.getByLabelText(/Sesión introductoria 1 — Fecha/)).toHaveAttribute('type', 'date')
    expect(screen.getByLabelText(/Sesión introductoria 2 — Fecha/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Sesión introductoria 3/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('Enlace del formulario')).toHaveAttribute('type', 'url')
    expect(screen.getByRole('radio', { name: 'Botón que abre el formulario en otra pestaña' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'El formulario dentro de la página' })).not.toBeChecked()
  })

  it('show what is saved, and send it back as it is', () => {
    const { container } = render(<><CourseDetailsFields initial={filled} /><CourseRegistrationFields initial={filled} /></>)
    expect(screen.getByRole('radio', { name: 'El formulario dentro de la página' })).toBeChecked()
    expect(screen.getByLabelText('El curso da certificado')).toBeChecked()
    const extras = readCourseExtras(send(container))
    const { subtitle, duration, price, currency, ...expected } = filled
    expect(extras).toEqual(expected)
    expect(send(container).get('subtitle')).toBe(subtitle)
    expect(send(container).get('duration')).toBe('6 semanas')
    expect(send(container).get('price')).toBe('180')
    expect(send(container).get('currency')).toBe('USD')
  })

  it('a new course starts with nothing chosen: the form is a button, the sessions are empty', () => {
    const { container } = render(<><CourseDetailsFields /><CourseRegistrationFields /></>)
    const extras = readCourseExtras(send(container))
    expect(extras.registrationMode).toBe('button')
    expect(extras.introSessions).toEqual([])
    expect(extras.certificate).toBe(false)
    expect(extras.modality).toBe('')
  })
})

describe('CoursePeopleFields', () => {
  const sentPeople = (container: HTMLElement) => JSON.parse((container.querySelector('input[name="people_json"]') as HTMLInputElement).value)

  it('starts with nobody and offers to add teachers (up to four) and facilitators (up to two)', () => {
    const { container } = render(<CoursePeopleFields />)
    expect(sentPeople(container)).toEqual([])
    expect(screen.getByText('Docentes (hasta 4)')).toBeInTheDocument()
    expect(screen.getByText('Facilitadores de SurGlobal (hasta 2)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Añadir docente/ })).toBeInTheDocument()
  })

  it('sends what is typed for each person, and stops offering to add after four teachers and two facilitators', () => {
    const { container } = render(<CoursePeopleFields />)
    for (let i = 0; i < 4; i++) fireEvent.click(screen.getByRole('button', { name: /Añadir docente/ }))
    expect(screen.queryByRole('button', { name: /Añadir docente/ })).toBeNull()
    for (let i = 0; i < 2; i++) fireEvent.click(screen.getByRole('button', { name: /Añadir facilitador/ }))
    expect(screen.queryByRole('button', { name: /Añadir facilitador/ })).toBeNull()

    const names = screen.getAllByLabelText(/^Nombre \(\d\)$/)
    expect(names).toHaveLength(6)
    fireEvent.change(names[0], { target: { value: 'Ana Pérez' } })
    fireEvent.change(screen.getAllByLabelText('Rol o cargo')[0], { target: { value: 'Docente · UNAM' } })
    fireEvent.change(names[4], { target: { value: 'Luz Mora' } })
    const sent = sentPeople(container)
    expect(sent).toHaveLength(6)
    expect(sent[0]).toMatchObject({ group: 'teacher', name: 'Ana Pérez', role: 'Docente · UNAM' })
    expect(sent[4]).toMatchObject({ group: 'facilitator', name: 'Luz Mora' })
  })

  it('shows the people of a saved course and lets one be removed', () => {
    const initial = { ...EMPTY_COURSE_FORM, people: [
      { group: 'teacher' as const, name: 'Ana', role: '', bio: 'Hola', photoUrl: 'https://cdn/ana.webp', linkUrl: '' },
      { group: 'teacher' as const, name: 'Rui', role: '', bio: '', photoUrl: '', linkUrl: '' },
    ] }
    const { container } = render(<CoursePeopleFields initial={initial} />)
    expect(screen.getByDisplayValue('Ana')).toBeInTheDocument()
    expect(container.querySelector('input[name^="person_photo_"]')).toHaveValue('https://cdn/ana.webp')
    fireEvent.click(screen.getAllByRole('button', { name: 'Quitar a esta persona' })[0])
    expect(sentPeople(container).map((p: any) => p.name)).toEqual(['Rui'])
  })
})

describe('the banner already has the title', () => {
  it('is a checkbox under the banner, off for a new course and on for one that had it, and it is sent with the form', () => {
    const { container, unmount } = render(<CourseDetailsFields />)
    const box = screen.getByLabelText('Mi banner ya lleva el título') as HTMLInputElement
    expect(box.checked).toBe(false)
    unmount()
    const { container: saved } = render(<CourseDetailsFields initial={{ ...EMPTY_COURSE_FORM, bannerUrl: 'https://cdn/banner.webp', bannerHasTitle: true }} />)
    expect((saved.querySelector('input[name="banner_has_title"]') as HTMLInputElement).checked).toBe(true)
    expect(readCourseExtras(send(saved)).bannerHasTitle).toBe(true)
    void container
  })
})
