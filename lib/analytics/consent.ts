// Cookie consent for analytics. Nothing from Google is loaded until the visitor accepts; the choice
// is remembered in a first-party cookie for 6 months, and can be changed from the footer.
export const CONSENT_COOKIE = 'untold_cookie_consent'
export const CONSENT_EVENT = 'untold:cookie-settings'
export const PRIVACY_POLICY_PATH = '/politica-de-privacidad'
const MAX_AGE_DAYS = 180

export type ConsentChoice = 'granted' | 'denied'

/** The Google Analytics 4 measurement id (G-XXXXXXXXXX), or null when analytics isn't configured. */
export function getGaMeasurementId(): string | null {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  return id && /^G-[A-Z0-9]{4,20}$/.test(id) ? id : null
}

export function parseConsent(cookieHeader: string): ConsentChoice | null {
  const match = cookieHeader.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  const value = match?.slice(CONSENT_COOKIE.length + 1)
  return value === 'granted' || value === 'denied' ? value : null
}

export function serializeConsent(choice: ConsentChoice): string {
  return `${CONSENT_COOKIE}=${choice}; Max-Age=${MAX_AGE_DAYS * 24 * 60 * 60}; Path=/; SameSite=Lax`
}

/** Names of the cookies Google Analytics set (_ga, _ga_XXXX, _gid…), so they can be removed on refusal. */
export function analyticsCookieNames(cookieHeader: string): string[] {
  return cookieHeader
    .split(';')
    .map((c) => c.trim().split('=')[0])
    .filter((name) => name === '_ga' || name.startsWith('_ga_') || name === '_gid' || name.startsWith('_gat'))
}
