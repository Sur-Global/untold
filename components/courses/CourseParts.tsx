import { Award, BarChart3, CalendarDays, Check, Clock, Languages, MapPin, Monitor } from 'lucide-react'
import { audienceItems, PERSON_GROUPS, type CoursePerson, type IntroSession, type PersonGroup } from '@/lib/course-page'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

export type CourseFact = { id: string; icon: 'modality' | 'place' | 'starts' | 'duration' | 'language' | 'level' | 'certificate'; text: string }

const FACT_ICONS = { modality: Monitor, place: MapPin, starts: CalendarDays, duration: Clock, language: Languages, level: BarChart3, certificate: Award }

/** The key facts of a course in one strip under the banner (only the ones the course has) */
export function CourseFacts({ facts, label }: { facts: CourseFact[]; label: string }) {
  if (facts.length === 0) return null
  return (
    <ul aria-label={label} className="mt-6 flex list-none flex-wrap gap-x-7 gap-y-3 border-y border-black/10 py-4 text-sm text-[#3d342f]" style={aeonik}>
      {facts.map((fact) => {
        const Icon = FACT_ICONS[fact.icon]
        return (
          <li key={fact.id} className="flex items-center gap-2">
            <Icon size={17} aria-hidden className="shrink-0 text-[#6b6ad0]" />
            {fact.text}
          </li>
        )
      })}
    </ul>
  )
}

const STATUS_STYLE: Record<IntroSession['status'], { color: string; background: string }> = {
  open: { color: '#1f5c2e', background: 'rgba(31,92,46,0.1)' },
  few: { color: '#7a4a00', background: 'rgba(184,134,11,0.16)' },
  full: { color: '#6b6560', background: 'rgba(0,0,0,0.07)' },
}

/** The introductory sessions: each day (and time) with its status. `days` are already written in the reader's language. */
export function IntroSessionList({ sessions, statusLabels, timezone }: {
  sessions: { day: string; time: string; status: IntroSession['status'] }[]
  statusLabels: Record<IntroSession['status'], string>
  timezone?: string
}) {
  if (sessions.length === 0) return null
  return (
    <div>
      <ul className="m-0 list-none space-y-2 p-0" style={aeonik}>
        {sessions.map((session, i) => (
          <li key={i} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm">
            <span className={session.status === 'full' ? 'text-[#8a847d] line-through' : 'text-[#2c2420]'}>
              <span className="first-letter:uppercase inline-block">{session.day}</span>
              {session.time && <span> · {session.time}</span>}
            </span>
            <span className="rounded-full px-2.5 py-0.5 text-[11px]" style={STATUS_STYLE[session.status]}>{statusLabels[session.status]}</span>
          </li>
        ))}
      </ul>
      {timezone && <p className="mt-2 text-xs text-[#6B5F58]" style={aeonik}>{timezone}</p>}
    </div>
  )
}

/** "Who is this course for?": prominent, right after the top of the page. One idea per line becomes a checklist. */
export function CourseAudience({ title, text }: { title: string; text: string }) {
  const items = audienceItems(text)
  if (items.length === 0) return null
  return (
    <section className="rounded-2xl p-6 sm:p-8" style={{ background: 'rgba(161,161,233,0.18)', border: '1px solid rgba(161,161,233,0.5)' }}>
      <h2 className="mb-4 text-2xl" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.01em', color: '#1f1b2e' }}>{title}</h2>
      {items.length === 1 ? (
        <p className="text-lg leading-relaxed text-[#2c2420]" style={aeonik}>{items[0]}</p>
      ) : (
        <ul className="m-0 list-none space-y-3 p-0">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-[17px] leading-snug text-[#2c2420]" style={aeonik}>
              <Check size={20} aria-hidden className="mt-0.5 shrink-0 text-[#4a49b0]" />
              {item}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function initialsOf(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]?.toUpperCase() ?? '').join('')
}

function PersonCard({ person, viewProfile }: { person: CoursePerson; viewProfile: string }) {
  return (
    <li className="flex gap-4 rounded-2xl p-4" style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)' }}>
      {person.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={person.photoUrl} alt="" className="size-20 shrink-0 rounded-full object-cover" />
      ) : (
        <span aria-hidden className="flex size-20 shrink-0 items-center justify-center rounded-full text-xl text-[#26215C]" style={{ ...aeonik, background: '#A1A1E9' }}>{initialsOf(person.name)}</span>
      )}
      <div className="min-w-0">
        <p className="m-0 text-[17px] leading-tight text-[#1f1b2e]" style={{ ...aeonik, fontWeight: 500 }}>{person.name}</p>
        {person.role && <p className="mt-1 text-sm leading-snug text-[#6B5F58]" style={aeonik}>{person.role}</p>}
        {person.bio && <p className="mt-2 text-sm leading-relaxed text-[#3d342f]" style={aeonik}>{person.bio}</p>}
        {person.linkUrl && (
          <a href={person.linkUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm underline underline-offset-4" style={aeonik}>
            {viewProfile} ↗<span className="sr-only"> — {person.name}</span>
          </a>
        )}
      </div>
    </li>
  )
}

/** The teachers and the SurGlobal facilitators of the course, each group under its own subheading (a group with nobody is left out) */
export function CoursePeople({ people, title, groupTitles, viewProfile }: {
  people: CoursePerson[]
  title: string
  groupTitles: Record<PersonGroup, string>
  viewProfile: string
}) {
  if (people.length === 0) return null
  return (
    <section>
      <h2 className="mb-5 text-2xl" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</h2>
      <div className="space-y-6">
        {PERSON_GROUPS.map((group) => {
          const members = people.filter((person) => person.group === group)
          if (members.length === 0) return null
          return (
            <div key={group}>
              <h3 className="mb-3 text-xs uppercase tracking-[0.08em] text-[#6B5F58]" style={{ ...aeonik, fontWeight: 400 }}>{groupTitles[group]}</h3>
              <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2">
                {members.map((person, i) => <PersonCard key={`${group}-${i}`} person={person} viewProfile={viewProfile} />)}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}
