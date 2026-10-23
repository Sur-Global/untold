import { describe, it, expect, afterEach, vi } from 'vitest'
import { parseConsent, serializeConsent, analyticsCookieNames, getGaMeasurementId } from '@/lib/analytics/consent'

describe('consent cookie', () => {
  it('round-trips the visitor’s choice and lasts about 6 months', () => {
    for (const choice of ['granted', 'denied'] as const) {
      const cookie = serializeConsent(choice)
      expect(cookie).toContain('Max-Age=15552000')
      expect(cookie).toContain('SameSite=Lax')
      expect(parseConsent(`other=1; ${cookie.split(';')[0]}; more=2`)).toBe(choice)
    }
  })
  it('treats a missing or unknown value as "not asked yet"', () => {
    expect(parseConsent('')).toBeNull()
    expect(parseConsent('a=b')).toBeNull()
    expect(parseConsent('untold_cookie_consent=maybe')).toBeNull()
  })
  it('finds the Google Analytics cookies to remove on refusal, and nothing else', () => {
    expect(analyticsCookieNames('_ga=1; _ga_ABC123=2; _gid=3; session=x; untold_cookie_consent=denied')).toEqual([
      '_ga',
      '_ga_ABC123',
      '_gid',
    ])
  })
})

describe('getGaMeasurementId', () => {
  const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  afterEach(() => {
    vi.unstubAllEnvs()
    if (original === undefined) delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    else process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original
  })
  it('is null until a valid G- id is configured (so nothing loads by accident)', () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    expect(getGaMeasurementId()).toBeNull()
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-ABC'); alert(1)//"
    expect(getGaMeasurementId()).toBeNull()
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'UA-12345-1'
    expect(getGaMeasurementId()).toBeNull()
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = ' G-ABCD123456 '
    expect(getGaMeasurementId()).toBe('G-ABCD123456')
  })

  it('uses UNTOLD’s own data stream in production, and nothing in development or tests', () => {
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    vi.stubEnv('NODE_ENV', 'production')
    expect(getGaMeasurementId()).toBe('G-H99ZMNWD14')
    vi.stubEnv('NODE_ENV', 'development')
    expect(getGaMeasurementId()).toBeNull()
  })

  it('an explicit env value wins over the built-in one, and an invalid one switches analytics off', () => {
    vi.stubEnv('NODE_ENV', 'production')
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'G-OTHER12345'
    expect(getGaMeasurementId()).toBe('G-OTHER12345')
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = 'not-an-id'
    expect(getGaMeasurementId()).toBeNull()
  })
})
