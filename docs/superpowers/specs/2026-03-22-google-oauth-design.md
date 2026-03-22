# Google OAuth (Social Login) Design

## Goal

Add "Continue with Google" to both the login and signup pages, alongside the existing email/password form, in a way that is trivially extensible to additional OAuth providers (GitHub, Apple, etc.).

## Architecture

### New components

**`components/auth/OAuthButton.tsx`**
- `'use client'`
- Props: `provider: string` — use a plain string rather than importing `Provider` from `@supabase/auth-js` directly; the type can be narrowed to a union literal if needed later
- On click: calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: \`\${window.location.origin}/auth/callback?locale=\${locale}\` } })`
  - Pass the current locale as a query param so the callback route can restore it on redirect
  - `locale` is obtained via `useLocale()` from `next-intl`
- Loading state: disable the button and show `'...'` (matches existing form buttons)
- Error handling: if `signInWithOAuth` returns `{ error }` before redirecting, show an inline `<p className="text-sm text-red-600">` below the button

**`components/auth/OAuthDivider.tsx`**
- Stateless, renders a horizontal rule with a translated "or" label centered over it
- No props; uses `useTranslations('auth')` to read `t('orDivider')`
- Note: couples to the `'auth'` namespace by design — this component is auth-specific

### Modified components

**`components/auth/LoginForm.tsx`**
- Add `<OAuthButton provider="google" />` and `<OAuthDivider />` above the email/password fields

**`components/auth/SignupForm.tsx`**
- Same: `<OAuthButton provider="google" />` and `<OAuthDivider />` above the email/password fields

**`app/[locale]/auth/callback/route.ts`**
- Read `locale` query param from the callback URL; fall back to `'en'` if absent or not in the supported list
- Build a locale prefix helper:
  ```ts
  const LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da', 'qu']
  const locale = LOCALES.includes(rawLocale) ? rawLocale : 'en'
  const prefix = locale === 'en' ? '' : `/${locale}`
  ```
- New user redirect: `${origin}${prefix}/dashboard/complete-profile`
- Returning user redirect: `${origin}${prefix}${next}` (where `next` defaults to `'/'`)
- Error redirect: `${origin}${prefix}/auth/login?error=auth_error`
- This also fixes a pre-existing bug where non-English OAuth users were redirected to the English `/dashboard/complete-profile` path

## Data flow

1. User clicks "Continue with Google"
2. `signInWithOAuth` redirects to Google's consent screen with `redirectTo` including the locale param
3. Google redirects back to `/auth/callback?code=...&locale=es` (example)
4. Callback route exchanges code for session, reads `locale` param, checks profile slug
5. New user (auto-generated slug `user-*`) → redirect to `${prefix}/dashboard/complete-profile` (where `prefix` is `''` for `en`, `'/es'` for `es`, etc.)
6. Returning user → redirect to `${prefix}${next}` (e.g. `en` + `next='/'` → `/`; `es` + `next='/'` → `/es/`)

## i18n

Add to **all** locale files (`en.json`, `es.json`, `pt.json`, `fr.json`, `de.json`, `da.json`, `qu.json`) under the `"auth"` namespace:

```json
"continueWith": "Continue with {provider}",
"orDivider": "or"
```

Provider display names are hardcoded in `OAuthButton` as a `Record<string, string>`:
```ts
const PROVIDER_LABELS: Record<string, string> = { google: 'Google' }
```

The button label is rendered as:
```ts
t('continueWith', { provider: PROVIDER_LABELS[provider] ?? provider })
```
This passes the human-readable label (e.g. `'Google'`) as the `provider` interpolation value, producing `"Continue with Google"`.

For non-English locales, use the English strings as placeholders (they are proper nouns / universal words that don't need translation for the initial launch).

## Extensibility

Adding GitHub later:
1. Add `<OAuthButton provider="github" />` in the login/signup forms
2. Add `github: 'GitHub'` to `PROVIDER_LABELS` in `OAuthButton`
3. Add the GitHub SVG icon to the icon map

No new infrastructure needed.

## Styling

- Button variant: `outline` (matches `variant="outline"` in the project's Button component)
- Full width, consistent height with the submit button
- Provider icon left-aligned, label centered
- Neutral styling — no brand colors — to fit the UNTOLD palette

## Testing

- Unit: `OAuthButton` calls `signInWithOAuth` with correct provider and `redirectTo` including locale
  - Mock `createClient` from `@/lib/supabase/client` (same pattern as other auth component tests)
  - Mock `useLocale` from `next-intl`
- E2E: not tested (requires live Google credentials); the callback flow is covered by existing E2E tests
