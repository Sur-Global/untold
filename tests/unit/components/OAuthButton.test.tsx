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
