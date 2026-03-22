# Google OAuth (Social Login) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" to the login and signup pages alongside email/password, with locale-aware OAuth redirects extensible to future providers.

**Architecture:** A single `OAuthButton` component calls `supabase.auth.signInWithOAuth`, passing the current locale as a query param so the callback route can restore it. The callback route is updated to read that param and construct locale-prefixed redirects for all three outcomes (new user, returning user, error).

**Tech Stack:** Next.js 16 App Router, Supabase Auth (`signInWithOAuth`), next-intl (`useLocale`, `useTranslations`), Vitest + Testing Library

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `components/auth/OAuthButton.tsx` | **Create** | "Continue with Google" button, calls `signInWithOAuth` |
| `components/auth/OAuthDivider.tsx` | **Create** | "or" divider between OAuth and email/password |
| `components/auth/LoginForm.tsx` | **Modify** | Add `OAuthButton` + `OAuthDivider` above form |
| `components/auth/SignupForm.tsx` | **Modify** | Add `OAuthButton` + `OAuthDivider` above form |
| `app/[locale]/auth/callback/route.ts` | **Modify** | Locale-aware redirects using `?locale=` param |
| `messages/en.json` | **Modify** | Add `auth.continueWith` and `auth.orDivider` |
| `messages/es.json` | **Modify** | Same keys (English placeholders) |
| `messages/pt.json` | **Modify** | Same keys (English placeholders) |
| `messages/fr.json` | **Modify** | Same keys (English placeholders) |
| `messages/de.json` | **Modify** | Same keys (English placeholders) |
| `messages/da.json` | **Modify** | Same keys (English placeholders) |
| `messages/qu.json` | **Modify** | Same keys (English placeholders) |
| `tests/unit/components/OAuthButton.test.tsx` | **Create** | Unit tests for OAuthButton |

---

### Task 1: Add i18n keys to all locale files

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/es.json`
- Modify: `messages/pt.json`
- Modify: `messages/fr.json`
- Modify: `messages/de.json`
- Modify: `messages/da.json`
- Modify: `messages/qu.json`

- [ ] **Step 1: Add keys to en.json**

Open `messages/en.json`. Find the `"auth"` object. Add two keys after `"saveProfile"`:

```json
"continueWith": "Continue with {provider}",
"orDivider": "or"
```

The `"auth"` block should end like:
```json
"saveProfile": "Save and continue",
"continueWith": "Continue with {provider}",
"orDivider": "or"
```

- [ ] **Step 2: Add same keys to all other locale files**

In each of `es.json`, `pt.json`, `fr.json`, `de.json`, `da.json`, `qu.json`, add the same two keys under `"auth"`. Use the English values as placeholders — they're proper nouns or universal words:

```json
"continueWith": "Continue with {provider}",
"orDivider": "or"
```

- [ ] **Step 3: Verify no missing-key errors**

Run:
```bash
npm run build 2>&1 | grep -i "missing\|translation"
```
Expected: no output (no missing key warnings).

- [ ] **Step 4: Commit**

```bash
git add messages/
git commit -m "feat: add OAuth i18n keys to all locale files"
```

---

### Task 2: Create OAuthDivider component

**Files:**
- Create: `components/auth/OAuthDivider.tsx`

- [ ] **Step 1: Create the component**

```tsx
'use client'
import { useTranslations } from 'next-intl'

export function OAuthDivider() {
  const t = useTranslations('auth')
  return (
    <div className="relative my-4">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t" style={{ borderColor: 'rgba(139,69,19,0.15)' }} />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-background px-2 text-muted-foreground font-mono">
          {t('orDivider')}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/auth/OAuthDivider.tsx
git commit -m "feat: add OAuthDivider component"
```

---

### Task 3: Create OAuthButton component with tests (TDD)

**Files:**
- Create: `tests/unit/components/OAuthButton.test.tsx`
- Create: `components/auth/OAuthButton.tsx`

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/components/OAuthButton.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSignInWithOAuth = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { signInWithOAuth: mockSignInWithOAuth },
  }),
}))

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  useLocale: () => 'en',
}))

// Import after mocks
import { OAuthButton } from '@/components/auth/OAuthButton'

describe('OAuthButton', () => {
  beforeEach(() => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
  })

  it('renders a button with provider label', () => {
    render(<OAuthButton provider="google" />)
    expect(screen.getByRole('button')).toHaveTextContent('continueWith')
  })

  it('calls signInWithOAuth with correct provider on click', async () => {
    render(<OAuthButton provider="google" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({
        provider: 'google',
        options: expect.objectContaining({
          redirectTo: expect.stringContaining('/auth/callback?locale=en'),
        }),
      })
    })
  })

  it('passes the current locale in redirectTo', async () => {
    render(<OAuthButton provider="google" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      const call = mockSignInWithOAuth.mock.calls[0][0]
      expect(call.options.redirectTo).toContain('locale=en')
    })
  })

  it('disables the button and shows ... while loading', async () => {
    mockSignInWithOAuth.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<OAuthButton provider="google" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByRole('button')).toHaveTextContent('...')
    })
  })

  it('shows an error message if signInWithOAuth returns an error', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: { message: 'Provider not enabled' } })
    render(<OAuthButton provider="google" />)
    fireEvent.click(screen.getByRole('button'))
    await waitFor(() => {
      expect(screen.getByText('Provider not enabled')).toBeInTheDocument()
    })
  })
})
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- tests/unit/components/OAuthButton.test.tsx
```
Expected: FAIL — `Cannot find module '@/components/auth/OAuthButton'`

- [ ] **Step 3: Implement OAuthButton**

Create `components/auth/OAuthButton.tsx`:

```tsx
'use client'
import { useState, type ReactNode } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

const PROVIDER_LABELS: Record<string, string> = {
  google: 'Google',
}

// Google "G" logo SVG (neutral colors, no brand fill)
function GoogleIcon() {
  return (
    <svg className="h-4 w-4 mr-2 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

const PROVIDER_ICONS: Record<string, ReactNode> = {
  google: <GoogleIcon />,
}

interface OAuthButtonProps {
  provider: string
}

export function OAuthButton({ provider }: OAuthButtonProps) {
  const t = useTranslations('auth')
  const locale = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider as any,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?locale=${locale}`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // On success, browser redirects — no need to reset loading
  }

  const label = PROVIDER_LABELS[provider] ?? provider
  const icon = PROVIDER_ICONS[provider] ?? null

  return (
    <div className="space-y-1">
      <Button
        type="button"
        variant="outline"
        className="w-full flex items-center justify-center"
        disabled={loading}
        onClick={handleClick}
      >
        {icon}
        {loading ? '...' : t('continueWith', { provider: label })}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- tests/unit/components/OAuthButton.test.tsx
```
Expected: PASS — 5 tests passing

- [ ] **Step 5: Commit**

```bash
git add components/auth/OAuthButton.tsx tests/unit/components/OAuthButton.test.tsx
git commit -m "feat: add OAuthButton component with tests"
```

---

### Task 4: Update LoginForm and SignupForm

**Files:**
- Modify: `components/auth/LoginForm.tsx`
- Modify: `components/auth/SignupForm.tsx`

- [ ] **Step 1: Update LoginForm**

Replace the contents of `components/auth/LoginForm.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OAuthButton } from './OAuthButton'
import { OAuthDivider } from './OAuthDivider'

export function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <OAuthButton provider="google" />
      <OAuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('passwordLabel')}</Label>
          <Input id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full gradient-rust text-white border-0">
          {loading ? '...' : t('loginButton')}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Update SignupForm**

Replace the contents of `components/auth/SignupForm.tsx` with:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OAuthButton } from './OAuthButton'
import { OAuthDivider } from './OAuthDivider'

export function SignupForm() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError(null)
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    setLoading(false)
    if (error) { setError(error.message); return }
    setDone(true)
  }

  if (done) return <p className="text-center py-4">{t('confirmEmail')}</p>

  return (
    <div className="space-y-4">
      <OAuthButton provider="google" />
      <OAuthDivider />
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">{t('emailLabel')}</Label>
          <Input id="email" type="email" value={email}
            onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">{t('passwordLabel')}</Label>
          <Input id="password" type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full gradient-rust text-white border-0">
          {loading ? '...' : t('signupButton')}
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Run full test suite**

```bash
npm test
```
Expected: all tests pass (no regressions in LoginForm/SignupForm tests)

- [ ] **Step 4: Commit**

```bash
git add components/auth/LoginForm.tsx components/auth/SignupForm.tsx
git commit -m "feat: add Google OAuth button to login and signup forms"
```

---

### Task 5: Update callback route with locale-aware redirects

**Files:**
- Modify: `app/[locale]/auth/callback/route.ts`

- [ ] **Step 1: Replace the callback route**

Replace the full contents of `app/[locale]/auth/callback/route.ts`:

```ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da', 'qu']

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  const rawLocale = searchParams.get('locale') ?? 'en'
  const locale = SUPPORTED_LOCALES.includes(rawLocale) ? rawLocale : 'en'
  const prefix = locale === 'en' ? '' : `/${locale}`

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: profile } = await (supabase as any)
          .from('profiles')
          .select('slug, display_name')
          .eq('id', user.id)
          .single() as { data: { slug: string; display_name: string } | null }
        if (profile?.slug?.startsWith('user-')) {
          return NextResponse.redirect(`${origin}${prefix}/dashboard/complete-profile`)
        }
      }
      return NextResponse.redirect(`${origin}${prefix}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}${prefix}/auth/login?error=auth_error`)
}
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | grep -E "error|✓ Compiled"
```
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add "app/[locale]/auth/callback/route.ts"
git commit -m "fix: locale-aware redirects in OAuth callback route"
```

---

### Task 6: Final verification and push

- [ ] **Step 1: Run full test suite**

```bash
npm test
```
Expected: all tests pass

- [ ] **Step 2: Run lint**

```bash
npm run lint
```
Expected: 0 errors

- [ ] **Step 3: Run build**

```bash
npm run build 2>&1 | tail -5
```
Expected: successful build, no errors

- [ ] **Step 4: Push to trigger CI**

```bash
git push
```

- [ ] **Step 5: Confirm CI passes**

```bash
gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId') --exit-status
```
Expected: all steps green

---

## Supabase Dashboard Setup (manual step — outside code)

Before testing the flow end-to-end, Google must be enabled as an OAuth provider in the Supabase dashboard:

1. Go to **Authentication → Providers → Google**
2. Enable it and paste the Google OAuth Client ID and Secret
3. Add `https://[your-project].supabase.co/auth/v1/callback` as an authorized redirect URI in the Google Cloud Console

This is a one-time manual step and does not affect CI.
