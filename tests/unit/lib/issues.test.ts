import { describe, it, expect } from 'vitest'
import { monthToDate, dateToMonth, issueMonthLabel, issueLabel, issuePath, toRoman, issueYear } from '@/lib/issues'

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
  it('builds "Número VII · septiembre de 2026" with the number in Roman numerals', () => {
    expect(issueLabel('Número', 7, '2026-09-01', 'es')).toBe('Número VII · septiembre de 2026')
    expect(issueLabel('Issue', 5, '2026-07-01', 'en')).toBe('Issue V · July 2026')
  })
  it('writes Roman numerals and falls back to plain digits outside their range', () => {
    expect([1, 4, 5, 6, 7, 9, 12, 14, 19].map(toRoman)).toEqual(['I', 'IV', 'V', 'VI', 'VII', 'IX', 'XII', 'XIV', 'XIX'])
    expect(toRoman(0)).toBe('0')
    expect(toRoman(4000)).toBe('4000')
  })
  it('numbers restart every year, so an issue’s address has the year and the number', () => {
    expect(issueYear('2026-07-01')).toBe(2026)
    expect(issuePath('2026-07-01', 5)).toBe('/issues/2026/5')
    expect(issuePath('2027-01-01', 5)).toBe('/issues/2027/5')
  })
})
