import { describe, it, expect } from 'vitest'
import { monthToDate, dateToMonth, issueMonthLabel, issueMonthName, issueLabel, issuePath, issueYear, issueMonth } from '@/lib/issues'

describe('issue months', () => {
  it('turns a month picker value into the date stored, and back', () => {
    expect(monthToDate('2026-10')).toBe('2026-10-01')
    expect(dateToMonth('2026-10-01')).toBe('2026-10')
    expect(dateToMonth(null)).toBe('')
  })
  it('rejects anything that is not a month', () => {
    expect(monthToDate('')).toBeNull()
    expect(monthToDate('2026-13')).toBeNull()
    expect(monthToDate('octubre')).toBeNull()
  })
})

describe('issue labels', () => {
  it('names the month in the reader’s language, without timezone drift on the first of the month', () => {
    expect(issueMonthLabel('2026-10-01', 'es')).toBe('octubre de 2026')
    expect(issueMonthLabel('2026-01-01', 'en')).toBe('January 2026')
  })
  it('gives the month alone, capitalised, and the whole label capitalised', () => {
    expect(issueMonthName('2026-09-01', 'es')).toBe('Septiembre')
    expect(issueMonthName('2025-12-01', 'en')).toBe('December')
    expect(issueLabel('2026-09-01', 'es')).toBe('Septiembre de 2026')
    expect(issueLabel('2026-07-01', 'en')).toBe('July 2026')
  })
  it('reads the year and the month out of the stored date', () => {
    expect(issueYear('2026-07-01')).toBe(2026)
    expect(issueMonth('2026-07-01')).toBe(7)
    expect(issueMonth('2025-12-01')).toBe(12)
  })
  it('gives each issue an address made of its year and month (there is one issue per month)', () => {
    expect(issuePath('2026-09-01')).toBe('/issues/2026/9')
    expect(issuePath('2025-12-01')).toBe('/issues/2025/12')
  })
})
