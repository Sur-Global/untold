import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, it, expect, vi } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key }))
const action = vi.hoisted(() => ({ subscribeToNewsletter: vi.fn() }))
vi.mock('@/lib/actions/subscribe', () => action)

import { SubscribeForm } from '@/components/layout/SubscribeForm'

beforeEach(() => action.subscribeToNewsletter.mockReset())

describe('SubscribeForm, banner version', () => {
  it('shows the label of the email field (not only the placeholder) and asks for nothing else', () => {
    render(<SubscribeForm variant="banner" />)
    const input = screen.getByLabelText('emailLabel')
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('placeholder', 'emailPlaceholder')
    expect(document.querySelector('input[name="firstname"]')).toBeNull()
    expect(screen.getByRole('button', { name: 'submit' })).toBeInTheDocument()
    expect(screen.getByText('privacy')).toBeInTheDocument()
  })

  it('the field only grows to fill the row from the small breakpoint up: stacked on a phone a plain flex-1 squashes it to its text', () => {
    render(<SubscribeForm variant="banner" />)
    const classes = screen.getByLabelText('emailLabel').className.split(/\s+/)
    expect(classes).toContain('h-11')
    expect(classes).toContain('sm:flex-1')
    expect(classes).not.toContain('flex-1')
  })

  it('an invalid email is announced and tied to the field', async () => {
    action.subscribeToNewsletter.mockResolvedValue({ ok: false, code: 'invalid' })
    render(<SubscribeForm variant="banner" />)
    await userEvent.type(screen.getByLabelText('emailLabel'), 'nope')
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('errorInvalid')
    const input = screen.getByLabelText('emailLabel')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input.getAttribute('aria-describedby')).toBe(alert.id)
  })

  it('a failure is announced too, and the field is not marked as invalid', async () => {
    action.subscribeToNewsletter.mockResolvedValue({ ok: false, code: 'failed' })
    render(<SubscribeForm variant="banner" />)
    await userEvent.type(screen.getByLabelText('emailLabel'), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('errorFailed')
    expect(screen.getByLabelText('emailLabel')).toHaveAttribute('aria-invalid', 'false')
  })

  it('on success the form gives way to a confirmation read out to screen readers', async () => {
    action.subscribeToNewsletter.mockResolvedValue({ ok: true })
    render(<SubscribeForm variant="banner" />)
    await userEvent.type(screen.getByLabelText('emailLabel'), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('success'))
    expect(screen.queryByRole('button', { name: 'submit' })).toBeNull()
  })

  it('sends the email, and the hidden trap field is not reachable with the keyboard', async () => {
    action.subscribeToNewsletter.mockResolvedValue({ ok: true })
    render(<SubscribeForm variant="banner" />)
    expect(document.querySelector('input[name="website"]')).toHaveAttribute('tabindex', '-1')
    await userEvent.type(screen.getByLabelText('emailLabel'), 'a@b.co')
    await userEvent.click(screen.getByRole('button', { name: 'submit' }))
    const sent = action.subscribeToNewsletter.mock.calls[0][0] as FormData
    expect(sent.get('email')).toBe('a@b.co')
  })
})

describe('SubscribeForm, card version (the pop-up)', () => {
  it('keeps the name field and labels the fields with aria-label', () => {
    render(<SubscribeForm />)
    expect(document.querySelector('input[name="firstname"]')).not.toBeNull()
    expect(screen.getByLabelText('emailLabel')).toHaveAttribute('type', 'email')
  })
})
