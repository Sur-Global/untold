import { describe, it, expect } from 'vitest'
import { profileGaps, publishErrorMessage, PROFILE_INCOMPLETE_MESSAGE, reminderDue, reminderEmail } from '@/lib/profile-complete'

describe('profileGaps (what a creator must have to publish)', () => {
  it('has nothing missing with a photo and a real name', () => {
    expect(profileGaps({ display_name: 'Pat López', avatar_url: 'https://x/a.webp' }, 'pat.lopez@example.com')).toEqual([])
  })
  it('asks for the photo', () => {
    expect(profileGaps({ display_name: 'Pat López', avatar_url: '  ' })).toEqual(['photo'])
    expect(profileGaps({ display_name: 'Pat López', avatar_url: null })).toEqual(['photo'])
  })
  it('asks for a real name when it is empty, an email, or just the first part of the login email', () => {
    expect(profileGaps({ display_name: '', avatar_url: 'x' })).toEqual(['name'])
    expect(profileGaps({ display_name: 'pat@example.com', avatar_url: 'x' })).toEqual(['name'])
    expect(profileGaps({ display_name: 'Pat.Lopez', avatar_url: 'x' }, 'pat.lopez@example.com')).toEqual(['name'])
  })
  it('asks for both when there is no profile at all', () => {
    expect(profileGaps(null)).toEqual(['photo', 'name'])
  })
})

describe('publishErrorMessage', () => {
  it('turns the database refusal into a clear instruction', () => {
    expect(publishErrorMessage({ message: 'profile_incomplete: add a photo and your real name to your profile before publishing' })).toBe(PROFILE_INCOMPLETE_MESSAGE)
  })
  it('leaves any other message as it came', () => {
    expect(publishErrorMessage({ message: 'permission denied' })).toBe('permission denied')
    expect(publishErrorMessage(null)).toBe('Could not publish')
  })
})

describe('reminderDue (day 3 and day 10, then stop)', () => {
  const joined = '2026-10-01T10:00:00Z'
  const at = (days: number) => new Date(new Date(joined).getTime() + days * 86400000)
  it('is not due in the first days', () => {
    expect(reminderDue(joined, 0, at(2.9))).toBeNull()
  })
  it('sends the first one from day 3', () => {
    expect(reminderDue(joined, 0, at(3))).toBe(1)
    expect(reminderDue(joined, 0, at(20))).toBe(1)
  })
  it('sends the second only from day 10 and only after the first', () => {
    expect(reminderDue(joined, 1, at(9))).toBeNull()
    expect(reminderDue(joined, 1, at(10))).toBe(2)
  })
  it('never sends a third', () => {
    expect(reminderDue(joined, 2, at(60))).toBeNull()
  })
})

describe('reminderEmail', () => {
  const base = { name: 'Pat López', gaps: ['photo', 'name'] as const, number: 1 as const, siteUrl: 'https://untold.example' }
  it('says what is missing, in Spanish and English, with the link to the profile', () => {
    const m = reminderEmail({ ...base, gaps: [...base.gaps] })
    expect(m.subject).toContain('Completa tu perfil')
    expect(m.text).toContain('tu foto y tu nombre real')
    expect(m.text).toContain('your photo and your real name')
    expect(m.text).toContain('https://untold.example/dashboard/profile')
    expect(m.html).toContain('href="https://untold.example/dashboard/profile"')
  })
  it('names only what is missing and marks the second one as the last', () => {
    const m = reminderEmail({ ...base, gaps: ['photo'], number: 2 })
    expect(m.text).toContain('tu foto en tu perfil')
    expect(m.text).not.toContain('nombre real')
    expect(m.text).toContain('último recordatorio')
    expect(m.text).toContain('last reminder')
  })
  it('does not greet with an email address', () => {
    expect(reminderEmail({ ...base, name: 'pat@example.com', gaps: ['name'] }).text.startsWith('Hola. ')).toBe(true)
  })
})
