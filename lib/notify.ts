// Notification emails to the UNTOLD team, sent through Sender's transactional API
// (https://api.sender.net/v2/message/send). Needs, in the environment:
//   SENDER_API_TOKEN     — same token the newsletter form uses
//   NOTIFY_FROM_EMAIL    — a sender address verified in Sender (e.g. no-reply@yourdomain)
//   NOTIFY_FROM_NAME     — optional, defaults to "UNTOLD"
// Failing to send never breaks the user's action — it is only logged. The admin
// "Requests" page is the source of truth; the email is a heads-up.
const SENDER_API = 'https://api.sender.net/v2'

export const FEATURE_REQUEST_EMAIL = process.env.FEATURE_REQUEST_EMAIL || 'elsie@surglobal.io'

export async function sendNotificationEmail(input: {
  to: string
  subject: string
  html: string
  text: string
}): Promise<boolean> {
  const token = process.env.SENDER_API_TOKEN
  const fromEmail = process.env.NOTIFY_FROM_EMAIL
  if (!token || !fromEmail) {
    console.error('[notify] email not sent: SENDER_API_TOKEN or NOTIFY_FROM_EMAIL is not set')
    return false
  }

  try {
    const res = await fetch(`${SENDER_API}/message/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        from: { email: fromEmail, name: process.env.NOTIFY_FROM_NAME || 'UNTOLD' },
        to: { email: input.to },
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    })
    if (!res.ok) {
      console.error(`[notify] Sender rejected the email: ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`)
      return false
    }
    return true
  } catch (err) {
    console.error('[notify] email request failed:', err)
    return false
  }
}
