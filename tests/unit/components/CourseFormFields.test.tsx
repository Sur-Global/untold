import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { CourseDetailsFields, CourseRegistrationFields, EMPTY_COURSE_FORM, type CourseFormInitial } from '@/components/courses/CourseFormFields'
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
