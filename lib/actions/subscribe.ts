'use server'

import { addSenderSubscriber } from '@/lib/sender'

export type SubscribeResult = { ok: true } | { ok: false; code: 'invalid' | 'failed' }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

// Expected problems are returned, not thrown: production Next.js hides thrown messages.
export async function subscribeToNewsletter(formData: FormData): Promise<SubscribeResult> {
  // Honeypot: real visitors never see or fill this field. Pretend it worked so bots move on.
  if (String(formData.get('website') ?? '').trim()) return { ok: true }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, code: 'invalid' }

  const firstname = String(formData.get('firstname') ?? '').trim().slice(0, 80)

  return addSenderSubscriber({ email, firstname: firstname || undefined })
}
