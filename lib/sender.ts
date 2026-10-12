// Sender (sender.net) newsletter API. Docs: https://api.sender.net/subscribers/add-subscriber/
// SENDER_API_TOKEN  — Sender → Settings → API access tokens (server-side secret)
// SENDER_GROUP_IDS  — optional, comma-separated group ids new subscribers are added to
const SENDER_API = 'https://api.sender.net/v2'

export type SenderResult = { ok: true } | { ok: false; code: 'invalid' | 'failed' }

export function isSenderConfigured(): boolean {
  return !!process.env.SENDER_API_TOKEN
}

export async function addSenderSubscriber(input: { email: string; firstname?: string }): Promise<SenderResult> {
  const token = process.env.SENDER_API_TOKEN
  if (!token) {
    console.error('[sender] SENDER_API_TOKEN is not set')
    return { ok: false, code: 'failed' }
  }

  const groups = (process.env.SENDER_GROUP_IDS ?? '')
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)

  try {
    const res = await fetch(`${SENDER_API}/subscribers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        ...(input.firstname ? { firstname: input.firstname } : {}),
        ...(groups.length ? { groups } : {}),
      }),
    })

    if (res.ok) return { ok: true }

    const body = await res.text().catch(() => '')
    console.error(`[sender] subscribe failed: ${res.status} ${body.slice(0, 300)}`)
    // Sender rejects malformed addresses with a validation error
    return { ok: false, code: res.status === 422 ? 'invalid' : 'failed' }
  } catch (err) {
    console.error('[sender] subscribe request error:', err)
    return { ok: false, code: 'failed' }
  }
}
