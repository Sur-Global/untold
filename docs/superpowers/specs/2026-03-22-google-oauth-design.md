# Google OAuth (Social Login) Design

## Goal

Add "Continue with Google" to both the login and signup pages, alongside the existing email/password form, in a way that is trivially extensible to additional OAuth providers (GitHub, Apple, etc.).

## Architecture

### New components

**`components/auth/OAuthButton.tsx`**
- `'use client'`
- Props: `provider: Provider` (Supabase's built-in `Provider` type from `@supabase/supabase-js`)
- On click: calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: \`\${window.location.origin}/auth/callback\` } })`
- Renders a full-width outlined button with a provider icon (Google SVG inline) and label from i18n
- Loading state while redirect is in flight

**`components/auth/OAuthDivider.tsx`**
- Stateless, renders a horizontal rule with "or" label centered over it
- No props

### Modified components

**`components/auth/LoginForm.tsx`**
- Add `<OAuthButton provider="google" />` and `<OAuthDivider />` above the email/password fields

**`components/auth/SignupForm.tsx`**
- Same: `<OAuthButton provider="google" />` and `<OAuthDivider />` above the email/password fields

### No changes needed

**`app/[locale]/auth/callback/route.ts`** — already handles the PKCE code exchange and profile-completion redirect for all OAuth providers.

## Data flow

1. User clicks "Continue with Google"
2. `signInWithOAuth` redirects to Google's consent screen
3. Google redirects back to `/auth/callback?code=...`
4. Callback route exchanges code for session, checks profile slug
5. New user (auto-generated slug `user-*`) → redirected to `/dashboard/complete-profile`
6. Returning user → redirected to `/`

## i18n

Add to `messages/en.json` (and all other locale files):
```json
"continueWith": "Continue with {provider}"
```

Provider display names:
- `google` → `"Google"`

## Extensibility

Adding GitHub later: `<OAuthButton provider="github" />` — no new infrastructure needed. The `Provider` type from Supabase covers all supported providers. Icons can be added to `OAuthButton` via a `provider → SVG` map.

## Styling

- Button variant: outlined (matches existing ghost/outline pattern in the app)
- Full width, consistent height with the submit button
- Provider icon left-aligned, label centered
- Brand colors are intentionally avoided — neutral styling fits the UNTOLD palette

## Testing

- Unit: `OAuthButton` calls `signInWithOAuth` with correct provider and redirectTo
- E2E: Not tested (requires live Google credentials) — the callback flow is already covered by existing E2E tests
