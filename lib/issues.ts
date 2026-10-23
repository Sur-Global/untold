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

/** 7 → "VII" (the magazine writes its issue numbers in Roman numerals: 2026 – VII) */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) return String(n)
  const table: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let rest = n
  let out = ''
  for (const [value, symbol] of table) while (rest >= value) { out += symbol; rest -= value }
  return out
}

/** The year of an issue, from its date */
export const issueYear = (date: string): number => Number(date.slice(0, 4))

/** "Número VII · octubre de 2026" */
export function issueLabel(word: string, number: number, date: string, locale: string): string {
  return `${word} ${toRoman(number)} · ${issueMonthLabel(date, locale)}`
}

/** Numbers restart every year, so an issue's address has both: /issues/2026/7 */
export const issuePath = (date: string, number: number) => `/issues/${issueYear(date)}/${number}`
