import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CourseAudience, CourseFacts, CoursePeople, IntroSessionList } from '@/components/courses/CourseParts'
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

describe('CoursePeople', () => {
  const groupTitles = { teacher: 'Docentes', facilitator: 'Facilitadores de SurGlobal' }
  const people = [
    { group: 'teacher' as const, name: 'Ana Pérez', role: 'Docente · UNAM', bio: 'Investiga futuros.', photoUrl: 'https://cdn.test/ana.webp', linkUrl: 'https://ana.example' },
    { group: 'teacher' as const, name: 'Rui Costa', role: '', bio: '', photoUrl: '', linkUrl: '' },
    { group: 'facilitator' as const, name: 'Luz Mora', role: 'Facilitación', bio: '', photoUrl: '', linkUrl: '' },
  ]

  it('shows each group under its subheading, with the photo, role, presentation and a link to the profile', () => {
    render(<CoursePeople people={people} title="Docentes y facilitación" groupTitles={groupTitles} viewProfile="Ver perfil" />)
    expect(screen.getByRole('heading', { name: 'Docentes y facilitación' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Docentes' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Facilitadores de SurGlobal' })).toBeInTheDocument()
    expect(screen.getByText('Docente · UNAM')).toBeInTheDocument()
    expect(screen.getByText('Investiga futuros.')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /Ver perfil/ })
    expect(link).toHaveAttribute('href', 'https://ana.example')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
    expect(document.querySelector('img')).toHaveAttribute('src', 'https://cdn.test/ana.webp')
  })

  it('shows the initials when a person has no photo, and no link when they have none', () => {
    render(<CoursePeople people={people} title="Equipo" groupTitles={groupTitles} viewProfile="Ver perfil" />)
    expect(screen.getByText('RC')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })

  it('leaves out a group with nobody, and shows nothing without people', () => {
    render(<CoursePeople people={people.filter((p) => p.group === 'facilitator')} title="Equipo" groupTitles={groupTitles} viewProfile="Ver perfil" />)
    expect(screen.queryByRole('heading', { name: 'Docentes' })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Facilitadores de SurGlobal' })).toBeInTheDocument()
    const { container } = render(<CoursePeople people={[]} title="Equipo" groupTitles={groupTitles} viewProfile="Ver perfil" />)
    expect(container).toBeEmptyDOMElement()
  })
})
