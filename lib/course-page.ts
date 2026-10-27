// The page of a course (Admin/creators: create and edit forms; readers: the course page). Pure helpers; the data lives in
// course_meta (see migration 20261027170000_course_page.sql). The subtitle is the translation's excerpt and the full
// description its body (rich text).

import { safeWebUrl } from '@/lib/web-url'

export const COURSE_MODALITIES = ['online', 'in_person', 'hybrid'] as const
export type CourseModality = (typeof COURSE_MODALITIES)[number]
export const COURSE_LEVELS = ['introductory', 'intermediate', 'advanced'] as const
export type CourseLevel = (typeof COURSE_LEVELS)[number]
export const SESSION_STATUSES = ['open', 'few', 'full'] as const
export type SessionStatus = (typeof SESSION_STATUSES)[number]
export const REGISTRATION_MODES = ['button', 'embed'] as const
export type RegistrationMode = (typeof REGISTRATION_MODES)[number]

/** The registration is to the introductory sessions: there are up to two, a month before the classes start */
export const MAX_INTRO_SESSIONS = 2

export type IntroSession = { date: string; time: string; status: SessionStatus }

/** What the course page shows besides the title, subtitle and description (the course_meta columns, as the forms use them) */
export type CourseExtras = {
  bannerUrl: string
  modality: CourseModality | ''
  place: string
  startsOn: string
  languageLabel: string
  level: CourseLevel | ''
  certificate: boolean
  audience: string
  priceNote: string
  providerName: string
  providerUrl: string
  registrationMode: RegistrationMode
  registrationUrl: string
  registrationLabel: string
  registrationNote: string
  introSessions: IntroSession[]
  introTimezone: string
}

const oneOf = <T extends string>(list: readonly T[], value: unknown): T | '' => (typeof value === 'string' && (list as readonly string[]).includes(value) ? (value as T) : '')
const text = (value: unknown, max: number): string => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export const isDate = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
const isTime = (value: unknown): value is string => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value)

/** The introductory sessions, cleaned: a valid date is needed, the time is optional, the status defaults to open; at most two, by date */
export function normalizeIntroSessions(raw: unknown): IntroSession[] {
  const list = typeof raw === 'string' ? (() => { try { return JSON.parse(raw) } catch { return [] } })() : raw
  if (!Array.isArray(list)) return []
  return list
    .map((s: any) => ({ date: isDate(s?.date) ? s.date : '', time: isTime(s?.time) ? s.time : '', status: (oneOf(SESSION_STATUSES, s?.status) || 'open') as SessionStatus }))
    .filter((s) => s.date)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, MAX_INTRO_SESSIONS)
}

/** The extras from the fields of a create/edit form */
export function readCourseExtras(formData: FormData): CourseExtras {
  const get = (name: string) => formData.get(name)
  const sessions = Array.from({ length: MAX_INTRO_SESSIONS }, (_, i) => ({ date: get(`intro_date_${i + 1}`), time: get(`intro_time_${i + 1}`), status: get(`intro_status_${i + 1}`) }))
  return {
    bannerUrl: safeWebUrl(get('banner_url')),
    modality: oneOf(COURSE_MODALITIES, get('modality')),
    place: text(get('place'), 120),
    startsOn: isDate(get('starts_on')) ? (get('starts_on') as string) : '',
    languageLabel: text(get('language_label'), 60),
    level: oneOf(COURSE_LEVELS, get('level')),
    certificate: get('certificate') === 'on' || get('certificate') === 'true',
    audience: text(get('audience'), 1500),
    priceNote: text(get('price_note'), 120),
    providerName: text(get('provider_name'), 120),
    providerUrl: safeWebUrl(get('provider_url')),
    registrationMode: oneOf(REGISTRATION_MODES, get('registration_mode')) || 'button',
    registrationUrl: safeWebUrl(get('registration_url')),
    registrationLabel: text(get('registration_label'), 40),
    registrationNote: text(get('registration_note'), 300),
    introSessions: normalizeIntroSessions(sessions),
    introTimezone: text(get('intro_timezone'), 80),
  }
}

/** The extras as course_meta columns (empty text becomes null) */
export function extrasToColumns(extras: CourseExtras) {
  const nullable = (value: string) => value || null
  return {
    banner_url: nullable(extras.bannerUrl),
    modality: nullable(extras.modality),
    place: nullable(extras.place),
    starts_on: nullable(extras.startsOn),
    language_label: nullable(extras.languageLabel),
    level: nullable(extras.level),
    certificate: extras.certificate,
    audience: nullable(extras.audience),
    price_note: nullable(extras.priceNote),
    provider_name: nullable(extras.providerName),
    provider_url: nullable(extras.providerUrl),
    registration_mode: extras.registrationMode,
    registration_url: nullable(extras.registrationUrl),
    registration_label: nullable(extras.registrationLabel),
    registration_note: nullable(extras.registrationNote),
    intro_sessions: extras.introSessions,
    intro_timezone: nullable(extras.introTimezone),
  }
}

/** The extras from a course_meta row */
export function extrasFromMeta(meta: any): CourseExtras {
  return {
    bannerUrl: safeWebUrl(meta?.banner_url),
    modality: oneOf(COURSE_MODALITIES, meta?.modality),
    place: text(meta?.place, 120),
    startsOn: isDate(meta?.starts_on) ? meta.starts_on : '',
    languageLabel: text(meta?.language_label, 60),
    level: oneOf(COURSE_LEVELS, meta?.level),
    certificate: !!meta?.certificate,
    audience: text(meta?.audience, 1500),
    priceNote: text(meta?.price_note, 120),
    providerName: text(meta?.provider_name, 120),
    providerUrl: safeWebUrl(meta?.provider_url),
    registrationMode: oneOf(REGISTRATION_MODES, meta?.registration_mode) || 'button',
    registrationUrl: safeWebUrl(meta?.registration_url),
    registrationLabel: text(meta?.registration_label, 40),
    registrationNote: text(meta?.registration_note, 300),
    introSessions: normalizeIntroSessions(meta?.intro_sessions),
    introTimezone: text(meta?.intro_timezone, 80),
  }
}

/**
 * Forms that can be shown inside the page: the address to put in the frame, or null when the form's provider is not one of the
 * allowed ones (or the link cannot be framed, like a short forms.gle link): the page then offers the button instead.
 */
export function formEmbedUrl(raw: string): string | null {
  const value = safeWebUrl(raw)
  if (!value) return null
  let url: URL
  try { url = new URL(value) } catch { return null }
  if (url.protocol !== 'https:') return null
  const host = url.hostname.toLowerCase()

  if (host === 'tally.so') {
    const id = url.pathname.match(/^\/(?:r|embed)\/([A-Za-z0-9_-]+)/)?.[1]
    return id ? `https://tally.so/embed/${id}?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1` : null
  }
  if (host === 'docs.google.com' && url.pathname.startsWith('/forms/') && url.pathname.includes('/viewform')) {
    url.searchParams.set('embedded', 'true')
    return url.toString()
  }
  if (host.endsWith('.typeform.com') && url.pathname.startsWith('/to/')) return url.toString()
  if (host === 'airtable.com') {
    const shared = url.pathname.match(/^\/(shr[A-Za-z0-9]+)/)?.[1]
    if (shared) return `https://airtable.com/embed/${shared}`
    return url.pathname.startsWith('/embed/') ? url.toString() : null
  }
  if (host.endsWith('.jotform.com') && /^\/\d+/.test(url.pathname)) return url.toString()
  if (host === 'forms.office.com') {
    url.searchParams.set('embed', 'true')
    return url.toString()
  }
  return null
}

/** A session as a reader sees it: "jueves, 12 de febrero" and, when it has one, "18:00" */
export function formatIntroSession(session: IntroSession, locale: string): { day: string; time: string } {
  const date = new Date(`${session.date}T12:00:00Z`)
  const day = new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)
  return { day, time: session.time }
}

/** The day classes start, as a reader sees it: "12 de marzo de 2027" */
export function formatCourseDate(value: string, locale: string): string {
  if (!isDate(value)) return ''
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}T12:00:00Z`))
}

/** The button of the registration: where it goes, or null when the organisers have not given a form yet */
export function registrationTarget(extras: Pick<CourseExtras, 'registrationUrl' | 'registrationMode'>): { href: string; embedUrl: string | null } | null {
  if (!extras.registrationUrl) return null
  return { href: extras.registrationUrl, embedUrl: extras.registrationMode === 'embed' ? formEmbedUrl(extras.registrationUrl) : null }
}

/** The starting text of the full description of a new course: the sections of a course page, to fill in or delete */
export function courseTemplateBlocks(headings: string[]): any[] {
  return headings.flatMap((heading) => [
    { type: 'heading', props: { level: 2 }, content: [{ type: 'text', text: heading, styles: {} }] },
    { type: 'paragraph', content: [] },
  ])
}

/** The price as a reader sees it, in their language ("US$180"), or null when the course is free */
export function formatPrice(price: number | null | undefined, currency: string | null | undefined, locale: string): string | null {
  if (!price || price <= 0) return null
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: currency || 'USD', maximumFractionDigits: Number.isInteger(price) ? 0 : 2 }).format(price)
  } catch {
    return `${currency ?? ''} ${price}`.trim()
  }
}

/** "Who is the course for?" as a list: one idea per line (a leading bullet or number is dropped) */
export function audienceItems(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim().replace(/^([•\-*]|\d+[.)])\s+/, ''))
    .filter(Boolean)
}

/** The messages (namespace coursePage) of each choice */
export const MODALITY_KEYS: Record<CourseModality, string> = { online: 'modalityOnline', in_person: 'modalityInPerson', hybrid: 'modalityHybrid' }
export const LEVEL_KEYS: Record<CourseLevel, string> = { introductory: 'levelIntroductory', intermediate: 'levelIntermediate', advanced: 'levelAdvanced' }
export const STATUS_KEYS: Record<SessionStatus, string> = { open: 'statusOpen', few: 'statusFew', full: 'statusFull' }
