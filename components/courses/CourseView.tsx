import type { ReactNode } from 'react'
import { CourseAudience, CourseFacts, IntroSessionList, type CourseFact } from '@/components/courses/CourseParts'
import { CourseRegistration } from '@/components/courses/CourseRegistration'
import type { IntroSession } from '@/lib/course-page'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

export type CourseViewProps = {
  /** above the banner: the language notice and the topic */
  notice?: ReactNode
  kicker?: ReactNode
  heading: string
  subtitle: string | null
  /** the banner picture, or the brand lime when there is none */
  bannerImage: string | null
  providerName: string
  providerUrl: string
  facts: CourseFact[]
  /** like, save, share… */
  actions: ReactNode
  audience: string
  /** the full description */
  content: ReactNode
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
  const buttonClass = 'flex h-12 w-full items-center justify-center rounded-full bg-black text-[15px] text-white transition-opacity hover:opacity-85'
  const buttonStyle = { ...aeonik, fontWeight: 500, textDecoration: 'none' }

  return (
    <>
      {p.notice}
      {p.kicker}

      {/* Header: with a picture, the picture alone (whole, no filter, no text over it) and the title, the subtitle and who
          gives the course below it; without one, the title, subtitle and provider sit on the brand lime */}
      {p.bannerImage ? (
        <header>
          <div className="overflow-hidden rounded-2xl" style={{ background: '#F2EEE8' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.bannerImage} alt="" className="mx-auto block h-auto max-h-[560px] w-full object-contain" />
          </div>
          <div className="pt-6 sm:pt-8">
            {provider && <p className="mb-2 text-sm text-[#6B5F58]" style={aeonik}>{p.labels.provider}: {provider}</p>}
            <h1 className="max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.08]" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.03em' }}>{p.heading}</h1>
            {p.subtitle && <p className="mt-3 max-w-2xl text-lg leading-snug text-[#555] sm:text-xl" style={{ ...aeonik, fontWeight: 300 }}>{p.subtitle}</p>}
          </div>
        </header>
      ) : (
        <header className="rounded-2xl" style={{ background: '#D2FE73' }}>
          <div className="flex min-h-[260px] flex-col justify-end p-6 sm:min-h-[340px] sm:p-10" style={{ color: '#000' }}>
            <h1 className="max-w-3xl text-[clamp(2rem,4.5vw,3.4rem)] leading-[1.08]" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.03em', color: 'inherit' }}>{p.heading}</h1>
            {p.subtitle && <p className="mt-3 max-w-2xl text-lg leading-snug sm:text-xl" style={{ ...aeonik, fontWeight: 300 }}>{p.subtitle}</p>}
            {provider && <p className="mt-4 text-sm" style={aeonik}>{p.labels.provider}: {provider}</p>}
          </div>
        </header>
      )}

      <CourseFacts facts={p.facts} label={p.labels.facts} />

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="min-w-0 space-y-10">
          {p.actions}
          <CourseAudience title={p.labels.audience} text={p.audience} />
          {p.content}
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

        {/* Sidebar: price, who gives it, the sessions and the button; it stays in view on a computer */}
        <aside className="h-fit rounded-2xl p-6 lg:sticky lg:top-24" style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.12)', boxShadow: '0 4px 16px rgba(44,36,32,0.08)' }}>
          <p className="text-xs uppercase tracking-[0.08em] text-[#6B5F58]" style={aeonik}>{p.labels.price}</p>
          <p className="mt-1 text-3xl" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.02em' }}>{p.price ?? p.labels.free}</p>
          {p.priceNote && <p className="mt-1 text-sm text-[#6B5F58]" style={aeonik}>{p.priceNote}</p>}

          {(provider || p.authorName) && (
            <div className="mt-5 border-t border-black/10 pt-4 text-sm" style={aeonik}>
              <p className="text-xs uppercase tracking-[0.08em] text-[#6B5F58]">{provider ? p.labels.provider : p.labels.instructor}</p>
              <p className="mt-1 text-[15px] text-[#2c2420]">{provider ?? p.authorName}</p>
            </div>
          )}

          {p.registration.sessions.length > 0 && (
            <div className="mt-5 border-t border-black/10 pt-4">
              <p className="mb-2 text-xs uppercase tracking-[0.08em] text-[#6B5F58]" style={aeonik}>{p.labels.intro}</p>
              <IntroSessionList sessions={p.registration.sessions} statusLabels={p.labels.status} timezone={p.registration.timezone} />
            </div>
          )}

          <div className="mt-6">
            {href ? (
              embedUrl ? (
                <a href="#inscripcion" className={buttonClass} style={buttonStyle}>{label}</a>
              ) : (
                <a href={href} target="_blank" rel="noopener noreferrer" className={buttonClass} style={buttonStyle}>{label} ↗</a>
              )
            ) : (
              <button disabled className="flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full bg-black/25 text-[15px] text-white/80" title={p.labels.enrollSoonTitle} style={aeonik}>
                {p.labels.enrollSoon}
              </button>
            )}
          </div>

          {p.rating != null && <p className="mt-4 text-sm text-[#6B5F58]" style={aeonik}>{p.labels.rating}: ★ {Number(p.rating).toFixed(1)}</p>}
        </aside>
      </div>
    </>
  )
}
