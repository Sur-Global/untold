import { describe, it, expect } from 'vitest'
import { COUNTRY_CODES, countryName, countryOptions, locationName, normalizeCountries, normalizeCountry } from '@/lib/countries'

describe('countries', () => {
  it('accepts a country code in any capitalisation, and nothing else', () => {
    expect(normalizeCountry('pe')).toBe('PE')
    expect(normalizeCountry(' DK ')).toBe('DK')
    expect(normalizeCountry('XX')).toBeNull()
    expect(normalizeCountry('Peru')).toBeNull()
    expect(normalizeCountry('')).toBeNull()
    expect(normalizeCountry(null)).toBeNull()
  })
  it('has no repeated codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length)
  })
  it('names a country in the reader’s language', () => {
    expect(countryName('DE', 'es')).toBe('Alemania')
    expect(countryName('DE', 'en')).toBe('Germany')
    expect(countryName('PE', 'fr')).toBe('Pérou')
  })
  it('lists the countries alphabetically in that language', () => {
    const names = countryOptions('es').map((c) => c.name)
    expect(names).toContain('Perú')
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es')))
  })
  it('keeps up to three valid countries, once each, in order (dual nationality)', () => {
    expect(normalizeCountries(['pe', 'DE'])).toEqual(['PE', 'DE'])
    expect(normalizeCountries(['PE', 'pe', 'XX', '', 'DE', 'ES', 'FR'])).toEqual(['PE', 'DE', 'ES'])
    expect(normalizeCountries('PE')).toEqual([])
    expect(normalizeCountries(null)).toEqual([])
  })
  it('names the country where a creator lives in the reader’s language, and nothing when it is not set', () => {
    expect(locationName('DE', 'es')).toBe('Alemania')
    expect(locationName('DE', 'en')).toBe('Germany')
    expect(locationName('de', 'fr')).toBe('Allemagne')
    expect(locationName('', 'es')).toBeNull()
    expect(locationName(null, 'es')).toBeNull()
    expect(locationName('Barcelona', 'es')).toBeNull()
  })
})
