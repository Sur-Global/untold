import { IntroSessionList } from '@/components/courses/CourseParts'
import type { IntroSession } from '@/lib/course-page'

const aeonik: React.CSSProperties = { fontFamily: 'var(--font-aeonik), Aeonik, sans-serif' }

/**
 * The registration to the introductory sessions: their days, a sentence about it and the organisers' form, shown inside the
 * page (when it can be) or as a button to it. Its anchor is #inscripcion.
 */
export function CourseRegistration({ title, note, sessions, statusLabels, timezone, href, embedUrl, label, formTitle, openLabel, noFormLabel }: {
  title: string
  note: string
  sessions: { day: string; time: string; status: IntroSession['status'] }[]
  statusLabels: Record<IntroSession['status'], string>
  timezone?: string
  /** where the form is; null while the organisers have not given one */
  href: string | null
  /** the form inside the page, when the provider allows it */
  embedUrl: string | null
  label: string
  formTitle: string
  openLabel: string
  noFormLabel: string
}) {
  if (sessions.length === 0 && !href) return null
  return (
    <section id="inscripcion" className="scroll-mt-24 rounded-2xl border border-black/15 bg-white p-6 sm:p-8">
      <h2 className="mb-2 text-2xl" style={{ ...aeonik, fontWeight: 500, letterSpacing: '-0.01em' }}>{title}</h2>
      <p className="mb-5 text-[15px] leading-relaxed text-[#6B5F58]" style={aeonik}>{note}</p>
      <IntroSessionList sessions={sessions} statusLabels={statusLabels} timezone={timezone} />

      {href ? (
        embedUrl ? (
          <div className="mt-6">
            <iframe
              src={embedUrl}
              title={formTitle}
              loading="lazy"
              className="h-[760px] w-full rounded-xl border border-black/10"
            />
            <a href={href} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-[#6b6ad0] underline-offset-4 hover:underline" style={aeonik}>
              {openLabel} ↗
            </a>
          </div>
        ) : (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 items-center rounded-full bg-black px-8 text-[15px] text-white transition-opacity hover:opacity-85"
            style={{ ...aeonik, fontWeight: 500, textDecoration: 'none' }}
          >
            {label} ↗
          </a>
        )
      ) : (
        <p className="mt-6 text-sm text-[#6B5F58]" style={aeonik}>{noFormLabel}</p>
      )}
    </section>
  )
}
