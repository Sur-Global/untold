import type { ReactNode } from 'react'
import { CourseAudience, CourseFacts, CoursePeople, type CourseFact } from '@/components/courses/CourseParts'
import { CourseRegistration } from '@/components/courses/CourseRegistration'
import { CourseSidebar } from '@/components/courses/CourseSidebar'
import type { CoursePerson, IntroSession, PersonGroup } from '@/lib/course-page'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

export type CourseViewProps = {
  /** above the banner: the language notice and the topic */
  notice?: ReactNode
  kicker?: ReactNode
  heading: string
  subtitle: string | null
  /** the banner picture, or the brand lime when there is none */
  bannerImage: string | null
  /** the picture already carries the title and the subtitle: they are not repeated under it (the title stays for search engines and screen readers) */
  bannerHasTitle?: boolean
  providerName: string
  providerUrl: string
  facts: CourseFact[]
  /** like, save, share… */
  actions: ReactNode
  audience: string
  /** the full description */
  content: ReactNode
  /** the teachers and the facilitators */
  people: CoursePerson[]
  registration: {
    note: string
    sessions: { day: string; time: string; status: IntroSession['status'] }[]
    timezone: string
    /** where the organisers' form is, or null while there is none */
    href: string | null
    embedUrl: string | null
    label: string
  }
  tags: ReactNode
  /** the price already written ("$180"), or null for a free course */
  price: string | null
  priceNote: string
  /** who gives the course when no organisation was named: the author */
  authorName?: string | null
  rating?: number | null
  labels: {
    facts: string; provider: string; instructor: string; price: string; free: string; intro: string; audience: string
    people: string; groups: Record<PersonGroup, string>; viewProfile: string
    status: Record<IntroSession['status'], string>
    formTitle: string; openForm: string; noForm: string; enrollSoon: string; enrollSoonTitle: string; rating: string
  }
}

/** The page of a course: banner, key facts, who it is for, the description, the registration to the introductory sessions and a sidebar with the price and the button. */
export function CourseView(p: CourseViewProps) {
  const provider = p.providerName
    ? p.providerUrl
      ? <a href={p.providerUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">{p.providerName} ↗</a>
      : p.providerName
    : null
  const { href, embedUrl, label } = p.registration

  return (
    <>
      {p.notice}
      {p.kicker}

      {/* Header: with a picture, the picture alone (whole, no filter, no text over it) and the provider, title and subtitle
          below it (unless the picture already carries the title); without one, only text on the page, no block of colour */}
      {p.bannerImage ? (
        <header>
          <div className="overflow-hidden rounded-2xl" style={{ background: '#F2EEE8' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.bannerImage} alt="" className="mx-auto block h-auto max-h-[560px] w-full object-contain" />
          </div>
          <div className={p.bannerHasTitle ? (provider ? 'pt-4' : '') : 'pt-6 sm:pt-8'}>
            {provider && <p className={`text-sm text-[#6B5F58] ${p.bannerHasTitle ? '' : 'mb-2'}`} style={aeonik}>{p.labels.provider}: {provider}</p>}
            <h1 className={p.bannerHasTitle ? 'sr-only' : 'max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.08]'} style={p.bannerHasTitle ? undefined : { ...aeonik, fontWeight: 500, letterSpacing: '-0.03em' }}>{p.heading}</h1>
            {p.subtitle && <p className={p.bannerHasTitle ? 'sr-only' : 'mt-3 max-w-2xl text-lg leading-snug text-[#555] sm:text-xl'} style={p.bannerHasTitle ? undefined : { ...aeonik, fontWeight: 300 }}>{p.subtitle}</p>}
          </div>
        </header>
      ) : (
        <header className="pt-4 sm:pt-8">
          {provider && <p className="mb-3 text-sm text-[#6B5F58]" style={aeonik}>{p.labels.provider}: {provider}</p>}
          <h1 className="max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.08]" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.03em' }}>{p.heading}</h1>
          {p.subtitle && <p className="mt-3 max-w-2xl text-lg leading-snug text-[#555] sm:text-xl" style={{ ...aeonik, fontWeight: 300 }}>{p.subtitle}</p>}
        </header>
      )}

      <CourseFacts facts={p.facts} label={p.labels.facts} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          {p.actions}
          <CourseAudience title={p.labels.audience} text={p.audience} />
          {p.content}
          <CoursePeople people={p.people} title={p.labels.people} groupTitles={p.labels.groups} viewProfile={p.labels.viewProfile} />
          <CourseRegistration
            title={p.labels.intro}
            note={p.registration.note}
            sessions={p.registration.sessions}
            statusLabels={p.labels.status}
            timezone={p.registration.timezone}
            href={href}
            embedUrl={embedUrl}
            label={label}
            formTitle={p.labels.formTitle}
            openLabel={p.labels.openForm}
            noFormLabel={p.labels.noForm}
          />
          {p.tags}
        </div>

        {/* Sidebar: price, who gives it, the sessions and the button. On a computer it stays in view and lets go of its button while the
            registration box is on screen; on a phone a bar at the bottom carries the price and the button until the box is reached */}
        <CourseSidebar
          price={p.price}
          priceNote={p.priceNote}
          provider={provider}
          authorName={p.authorName}
          rating={p.rating}
          registration={p.registration}
          labels={{
            price: p.labels.price, free: p.labels.free, provider: p.labels.provider, instructor: p.labels.instructor, intro: p.labels.intro, rating: p.labels.rating,
            status: p.labels.status, enrollSoon: p.labels.enrollSoon, enrollSoonTitle: p.labels.enrollSoonTitle,
          }}
        />
      </div>
    </>
  )
}
