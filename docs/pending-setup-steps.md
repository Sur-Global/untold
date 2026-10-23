# UNTOLD — pending setup steps and open decisions

Saved 2026-10-21. Written in English so a helper can follow it. Nothing here is urgent for the site to run:
the site is live and works, but the items below are needed for newsletter sign-ups, notification emails and security hygiene.

**Step-by-step guide (Spanish, for Elsie): `docs/guia-configuracion-paso-a-paso.md`** — Sender, Vercel, Supabase SMTP and key rotation.

## What is already live
- Newsletter form (own design) at the bottom of the homepage and in a footer pop-up. It falls back to Sender's hosted form until `SENDER_API_TOKEN` is set in Vercel.
- Feature requests: Admin → Requests queue, "Assign to editor" with instructions, email notifications (emails need the settings below).
- Members' content lives on their creator page until an editor approves/places it. Profile photos are upload-only. "I take responsibility" checkbox on every content type.
- Spanish privacy-policy **draft** (unpublished): Admin → Pages ("Política de privacidad") and `docs/politica-de-privacidad-borrador.md`.

## A. Security — rotate secrets that were pasted into a chat
1. Sender: Settings → API access tokens → create a new token, then delete the old one.
2. Supabase: Project Settings → API → rotate the `service_role` key and the JWT secret (these were shared earlier in a chat).
3. Put the new values in Vercel and in the local `.env.local`, then redeploy.

## B. Sender account
1. DECIDED 2026-10-23: the list that receives subscribers is **UNTOLD** (id `e0Ep3v`; form `stats.sender.net/forms/bkRwZr/view`). Set `SENDER_GROUP_IDS=e0Ep3v`.
2. Check the list/form double opt-in setting. Our form shows "Thanks for subscribing" either way.
3. Verify a sender identity (the From address) and authenticate the sending domain (SPF / DKIM / DMARC).
4. Confirm transactional emails are enabled on the plan. They are needed for the team notifications (feature requests and "assign to editor").

## C. Vercel → Project → Settings → Environment Variables (Production)
- `SENDER_API_TOKEN` — the new token (secret).
- `SENDER_GROUP_IDS` — comma-separated list ids, e.g. `e0Ep3v` (only after confirming B1).
- `NOTIFY_FROM_EMAIL` — the verified sender address from B3.
- `NOTIFY_FROM_NAME` — optional, defaults to "UNTOLD".
- `FEATURE_REQUEST_EMAIL` — optional, defaults to elsie@surglobal.io.
- `CRON_SECRET` — NEW: any long random string. The daily job `/api/cron/profile-reminders` (vercel.json) uses it; without it the job answers 401 and no reminder is sent.
- `NEXT_PUBLIC_SITE_URL` — must hold the real production URL (used for emails, canonical addresses and share pictures). Verified OK on 2026-10-23.
- Then **Redeploy**.

## D. Newsletter form (homepage section + footer "Subscribe" pop-up)
- Test with a throwaway address on the homepage and from the footer pop-up. Try an invalid address and another language (e.g. `/pt`).
- Check the contact appears in Sender (Subscribers, in the right group), then delete the test contact.

## E. Email tests
1. Log in as a normal member, publish a pill with "send to be featured" ticked → email to elsie@surglobal.io, plus an entry in Admin → Requests.
2. As admin, Admin → Requests → "Assign to editor" with a note → the editor receives an email. Check spam.
3. If the screen says "email not sent", search the Vercel logs for lines starting with `[notify]`.

## F. Supabase
- Storage → Settings: raise the global upload size limit if editors should upload videos larger than 50 MB. The `content-videos` bucket allows up to 500 MB, but the project limit applies first.
- Authentication → SMTP Settings: sign-up confirmation and password-reset emails use Supabase's built-in mailer, which is rate-limited and not meant for production. Set up custom SMTP (Sender's SMTP can be used; check their SMTP credentials page).

## G. Other
- **DeepL quota is exhausted** (500,000 / 500,000 characters on the free plan). Automatic translations of new content will fail until the monthly reset or until the account is upgraded to a paid (Pro) API plan.
- Privacy policy: lawyer review, fill the `[bracketed]` fields, then publish in Admin → Pages and tick "show in footer".

## G2. Google Analytics 4 (cookie banner is built; it stays invisible until the id exists)
1. analytics.google.com → sign in with the Google account → Admin → Create → Account (e.g. "UNTOLD / SurGlobal") → Property ("UNTOLD.ink", time zone Peru, currency USD).
2. Data stream → Web → URL of the site (production URL, or the final domain) → keep "Enhanced measurement" on → copy the **Measurement ID** (looks like `G-XXXXXXXXXX`).
3. Recommended privacy settings: Admin → Data collection → turn **Google signals** off; Data retention → 14 months; no ad personalization.
4. DONE — the measurement id `G-H99ZMNWD14` (stream UNTOLD, https://untold-six.vercel.app/) is built into the code (`lib/analytics/consent.ts`), so no Vercel variable is needed. If the site moves to its own domain, update the stream URL in Google Analytics. `NEXT_PUBLIC_GA_MEASUREMENT_ID` can still override it.
5. Test in a private window: the cookie banner appears; "Accept" → Google Analytics → Reports → Realtime shows 1 user; "Decline" → nothing is sent. The footer link "Cookie settings" reopens the banner.
6. Mention Google Analytics as a provider in the privacy policy (section 5, "Who we share data with") — to be added by Elsie/lawyer.

## H. Decisions waiting for Elsie
1. **Cover images** for pills / podcasts / videos (see the three options shown earlier):
   A) cover required (16:9) for everything; B) never required, auto-designed card when missing; **C) recommended:** one format per type (video 16:9 auto from YouTube/Vimeo, podcast square 1:1, pill any shape shown whole) plus the auto-designed card when a photo is missing. Also: should the square cover be **required** for podcasts?
2. **Incomplete creator profiles** — DECIDED 2026-10-23 (recommended option) and BUILT: a creator cannot publish without photo + real name (enforced in the database trigger `content_require_complete_profile`; admins/editors exempt) and gets two reminder emails (day 3 and day 10) from the daily job; needs the `CRON_SECRET` and Sender variables above. Original options:
   1) block the first publish without photo + real name; 2) two reminder emails (day 3 and day 10, then stop); 3) weekly digest to admins/editors listing incomplete profiles; 4) in-app notification inbox. Recommended: 1 + 2 (3 as an extra). Emails need a daily Vercel Cron job and working transactional email (section B/C).
3. Sender list: DECIDED — UNTOLD (B1).
4. **Translator gap (captions / card summaries):** DECIDED 2026-10-23: Claude translates captions and card summaries by hand (audit found none missing in the existing translations). **Article translations (pt/fr) are ON HOLD until Elsie gives the go-ahead.** Original note: the automatic translator does not translate image captions or the card summary of articles (the "Soberanía cultural" article was translated by hand). Offer: fix it so it does.
5. DONE 2026-10-23 — Portuguese is always Brazilian (interface, profiles, static pages, tags; DeepL now targets PT-BR). Original note: some interface strings added recently in Portuguese use European forms ("Subscrever", "o teu"), while the site's Portuguese is Brazilian. Offer: one pass to align them.
