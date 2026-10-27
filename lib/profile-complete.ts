// A creator must have a photo and a real name before publishing (the database enforces it when content
// becomes published). Creators who join and do not complete their profile get two reminder emails.

import { PODCAST_ORIGIN_REQUIRED_MESSAGE } from '@/lib/podcast-origin'

export type ProfileGap = 'photo' | 'name'

type ProfileLike = { display_name?: string | null; avatar_url?: string | null }

/** What is still missing: a photo, and a real name (not empty, not an email, not just the first part of the login email) */
export function profileGaps(profile: ProfileLike | null | undefined, loginEmail?: string | null): ProfileGap[] {
  const gaps: ProfileGap[] = []
  if (!profile?.avatar_url?.trim()) gaps.push('photo')
  const name = profile?.display_name?.trim() ?? ''
  const fromEmail = loginEmail ? loginEmail.split('@')[0].trim().toLowerCase() : null
  if (!name || name.includes('@') || (fromEmail !== null && name.toLowerCase() === fromEmail)) gaps.push('name')
  return gaps
}

export const PROFILE_INCOMPLETE_MESSAGE =
  'Add your photo and your real name to your profile before publishing (Dashboard → Edit profile).'

/** The message a creator sees when publishing is refused: clear for the profile and podcast-type rules, as it came for anything else */
export function publishErrorMessage(error: { message?: string } | null | undefined): string {
  const message = error?.message ?? 'Could not publish'
  if (message.includes('profile_incomplete')) return PROFILE_INCOMPLETE_MESSAGE
  if (message.includes('podcast_origin_required')) return PODCAST_ORIGIN_REQUIRED_MESSAGE
  return message
}

const DAY = 24 * 60 * 60 * 1000

/** Reminder emails: the first 3 days after joining, the second after 10 days, and then no more */
export function reminderDue(createdAt: string, sent: number, now: Date = new Date()): 1 | 2 | null {
  const age = now.getTime() - new Date(createdAt).getTime()
  if (sent === 0 && age >= 3 * DAY) return 1
  if (sent === 1 && age >= 10 * DAY) return 2
  return null
}

/** The reminder email (Spanish and English: we do not know the language of the person) */
export function reminderEmail({ name, gaps, number, siteUrl }: { name?: string | null; gaps: ProfileGap[]; number: 1 | 2; siteUrl: string }) {
  const hello = name && !name.includes('@') ? name.split(' ')[0] : ''
  const link = `${siteUrl}/dashboard/profile`
  const esMissing = gaps.map((g) => (g === 'photo' ? 'tu foto' : 'tu nombre real')).join(' y ')
  const enMissing = gaps.map((g) => (g === 'photo' ? 'your photo' : 'your real name')).join(' and ')
  const lastEs = number === 2 ? ' Este es el último recordatorio.' : ''
  const lastEn = number === 2 ? ' This is the last reminder.' : ''
  const subject = 'Completa tu perfil en UNTOLD / Complete your UNTOLD profile'
  const es = `${hello ? `Hola, ${hello}. ` : 'Hola. '}Para publicar en UNTOLD necesitamos ${esMissing} en tu perfil: buscamos creadores humanos dispuestos a responsabilizarse de lo que publican.${lastEs}`
  const en = `${hello ? `Hi ${hello}. ` : 'Hi. '}To publish on UNTOLD we need ${enMissing} on your profile: we look for human creators willing to stand behind what they publish.${lastEn}`
  const text = `${es}\nCompleta tu perfil: ${link}\n\n${en}\nComplete your profile: ${link}\n`
  const html = `<p>${es}</p><p><a href="${link}">Completa tu perfil</a></p><hr><p>${en}</p><p><a href="${link}">Complete your profile</a></p>`
  return { subject, text, html }
}
