import type { SupabaseClient } from '@supabase/supabase-js'
import { profileGaps, reminderDue, reminderEmail } from '@/lib/profile-complete'

type Mail = { to: string; subject: string; html: string; text: string }

/**
 * Reminder emails to creators whose profile still lacks a photo or a real name: one 3 days after joining,
 * one 10 days after, and no more. Only people who have signed in at least once are written to (profiles made
 * by imports have placeholder emails). A reminder that could not be sent is tried again the next day.
 */
export async function sendProfileReminders({
  service, send, siteUrl, now = new Date(),
}: {
  service: SupabaseClient
  send: (mail: Mail) => Promise<boolean>
  siteUrl: string
  now?: Date
}): Promise<{ checked: number; sent: number; failed: number }> {
  const db = service as any
  const { data: profiles } = await db
    .from('profiles')
    .select('id, display_name, avatar_url, created_at, profile_reminders_sent')
    .in('role', ['user', 'author'])
    .is('suspended_at', null)
    .eq('hidden', false)
    .lt('profile_reminders_sent', 2)
    .limit(500)

  let checked = 0
  let sent = 0
  let failed = 0
  for (const p of profiles ?? []) {
    const number = reminderDue(p.created_at, p.profile_reminders_sent ?? 0, now)
    if (!number) continue
    const { data: account } = await db.auth.admin.getUserById(p.id)
    const email: string | undefined = account?.user?.email
    if (!email || !account?.user?.last_sign_in_at) continue
    const gaps = profileGaps(p, email)
    if (gaps.length === 0) continue
    checked++
    const ok = await send({ to: email, ...reminderEmail({ name: p.display_name, gaps, number, siteUrl }) })
    if (!ok) { failed++; continue }
    sent++
    await db.from('profiles').update({ profile_reminders_sent: number, profile_reminder_at: now.toISOString() }).eq('id', p.id)
  }
  return { checked, sent, failed }
}
