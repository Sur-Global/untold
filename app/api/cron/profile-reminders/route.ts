import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { sendNotificationEmail } from '@/lib/notify'
import { siteUrl } from '@/lib/content-metadata'
import { sendProfileReminders } from '@/lib/data/profile-reminders'

export const dynamic = 'force-dynamic'

/** Runs once a day (Vercel Cron, see vercel.json). Vercel sends `Authorization: Bearer $CRON_SECRET`. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await sendProfileReminders({
    service: createServiceRoleClient(),
    send: sendNotificationEmail,
    siteUrl: siteUrl(),
  })
  return NextResponse.json(result)
}
