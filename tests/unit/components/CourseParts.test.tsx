import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CourseAudience, CourseFacts, IntroSessionList } from '@/components/courses/CourseParts'
import { CourseRegistration } from '@/components/courses/CourseRegistration'

const statusLabels = { open: 'Abierta', few: 'Últimas plazas', full: 'Agotada' } as const
const sessions = [
  { day: 'jueves, 11 de febrero', time: '18:00', status: 'open' as const },
  { day: 'jueves, 18 de febrero', time: '', status: 'full' as const },
]

describe('CourseFacts', () => {
  it('lists the facts the course has in one strip', () => {
    render(<CourseFacts label="Datos del curso" facts={[{ id: 'm', icon: 'modality', text: 'Híbrido' }, { id: 'p', icon: 'place', text: 'Bogotá' }, { id: 'c', icon: 'certificate', text: 'Con certificado' }]} />)
    const list = screen.getByRole('list', { name: 'Datos del curso' })
    expect([...list.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Híbrido', 'Bogotá', 'Con certificado'])
  })
  it('shows nothing without facts', () => {
    const { container } = render(<CourseFacts label="Datos" facts={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('IntroSessionList', () => {
  it('shows each session with its time and its status', () => {
    render(<IntroSessionList sessions={sessions} statusLabels={statusLabels} timezone="Hora de Bogotá (GMT-5)" />)
    expect(screen.getByText(/jueves, 11 de febrero/).closest('li')).toHaveTextContent('18:00')
    expect(screen.getByText('Abierta')).toBeInTheDocument()
    expect(screen.getByText('Agotada')).toBeInTheDocument()
    expect(screen.getByText('Hora de Bogotá (GMT-5)')).toBeInTheDocument()
  })
  it('shows nothing without sessions', () => {
    const { container } = render(<IntroSessionList sessions={[]} statusLabels={statusLabels} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('CourseAudience ("who is this course for?")', () => {
  it('shows one idea per line as a checklist under its own heading', () => {
    render(<CourseAudience title="¿Para quién es este curso?" text={'Personas que lideran equipos\nEstudiantes avanzados'} />)
    expect(screen.getByRole('heading', { name: '¿Para quién es este curso?' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Personas que lideran equipos', 'Estudiantes avanzados'])
  })
  it('a single idea is a plain paragraph, and without text there is no section', () => {
    render(<CourseAudience title="¿Para quién?" text="Cualquier persona curiosa" />)
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByText('Cualquier persona curiosa')).toBeInTheDocument()
    const { container } = render(<CourseAudience title="x" text="  " />)
    expect(container).toBeEmptyDOMElement()
  })
})

const registration = {
  title: 'Sesiones introductorias',
  note: 'La inscripción es para las sesiones introductorias.',
  sessions,
  statusLabels,
  label: 'Inscribirme',
  formTitle: 'Formulario de inscripción',
  openLabel: 'Abrir el formulario en otra pestaña',
  noFormLabel: 'Pronto abriremos las inscripciones.',
}

describe('CourseRegistration', () => {
  it('as a button: the sessions, the note and a button to the form in a new tab', () => {
    render(<CourseRegistration {...registration} href="https://tally.so/r/abc" embedUrl={null} />)
    expect(screen.getByRole('heading', { name: 'Sesiones introductorias' })).toBeInTheDocument()
    const button = screen.getByRole('link', { name: /Inscribirme/ })
    expect(button).toHaveAttribute('href', 'https://tally.so/r/abc')
    expect(button).toHaveAttribute('target', '_blank')
    expect(button).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByText('La inscripción es para las sesiones introductorias.')).toBeInTheDocument()
  })

  it('embedded: the form inside the page, with a link to open it in another tab', () => {
    const { container } = render(<CourseRegistration {...registration} href="https://tally.so/r/abc" embedUrl="https://tally.so/embed/abc?alignLeft=1" />)
    expect(screen.getByTitle('Formulario de inscripción')).toHaveAttribute('src', 'https://tally.so/embed/abc?alignLeft=1')
    expect(screen.getByRole('link', { name: /Abrir el formulario en otra pestaña/ })).toHaveAttribute('href', 'https://tally.so/r/abc')
    expect(container.querySelector('#inscripcion')).toBeInTheDocument()
  })

  it('says registration opens soon while there is no form yet', () => {
    render(<CourseRegistration {...registration} href={null} embedUrl={null} />)
    expect(screen.getByText('Pronto abriremos las inscripciones.')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('is not shown when the course has neither sessions nor a form', () => {
    const { container } = render(<CourseRegistration {...registration} sessions={[]} href={null} embedUrl={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
