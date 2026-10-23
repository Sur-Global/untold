/** Helpers for the magazine's numbered issues ("Números"). */

export type IssueStatus = 'draft' | 'published'

/** "2026-10" (a month picker) → "2026-10-01" (what the database stores) */
export function monthToDate(month: string): string | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month.trim())
  return m ? `${m[1]}-${m[2]}-01` : null
}

/** "2026-10-01" → "2026-10" */
export function dateToMonth(date: string | null | undefined): string {
  return typeof date === 'string' && /^\d{4}-\d{2}/.test(date) ? date.slice(0, 7) : ''
}

/** "octubre de 2026" / "October 2026" — the month an issue belongs to, in the reader's language */
export function issueMonthLabel(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`))
}

/** "septiembre" → "Septiembre" */
const capitalize = (text: string, locale: string) => text.charAt(0).toLocaleUpperCase(locale) + text.slice(1)

/** The year of an issue, from its date */
export const issueYear = (date: string): number => Number(date.slice(0, 4))

/** The month of an issue, 1–12 */
export const issueMonth = (date: string): number => Number(date.slice(5, 7))

/** "Septiembre" — the month alone, in the reader's language */
export function issueMonthName(date: string, locale: string): string {
  return capitalize(new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 10)}T00:00:00Z`)), locale)
}

/** "Septiembre de 2026" / "September 2026" */
export function issueLabel(date: string, locale: string): string {
  return capitalize(issueMonthLabel(date, locale), locale)
}

/** Issues are one per month, so an issue's address is its year and month: /issues/2026/9 */
export const issuePath = (date: string) => `/issues/${issueYear(date)}/${issueMonth(date)}`
