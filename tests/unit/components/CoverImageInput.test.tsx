import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock fetch for upload
global.fetch = vi.fn()

import { CoverImageInput } from '@/components/ui/CoverImageInput'

describe('CoverImageInput', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders upload zone when no defaultValue', () => {
    render(<CoverImageInput name="cover_image_url" />)
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
  })

  it('renders image preview when defaultValue is set', () => {
    render(<CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />)
    expect(screen.getByRole('img')).toBeInTheDocument()
    expect(screen.queryByText(/click to upload/i)).not.toBeInTheDocument()
  })

  it('renders hidden input with the current url value', () => {
    const { container } = render(
      <CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />
    )
    const hidden = container.querySelector('input[type="hidden"]') as HTMLInputElement
    expect(hidden.value).toBe('https://example.com/img.webp')
  })

  it('clears preview and shows upload zone when Remove is clicked', () => {
    render(<CoverImageInput name="cover_image_url" defaultValue="https://example.com/img.webp" />)
    fireEvent.click(screen.getByText(/remove/i))
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
  })

  it('re-hosts a pasted link on our side and uses the hosted copy', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ url: 'https://storage.example.com/hosted.webp' }),
    } as Response)
    const onChange = vi.fn()
    const { container } = render(<CoverImageInput name="cover_image_url" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://storage.example.com/hosted.webp'))
    expect(global.fetch).toHaveBeenCalledWith('/api/upload/from-url', expect.objectContaining({ method: 'POST' }))
    expect((container.querySelector('input[type="hidden"]') as HTMLInputElement).value).toBe('https://storage.example.com/hosted.webp')
  })

  it('keeps the pasted link and says why when it cannot be re-hosted', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      status: 422,
      json: async () => ({ error: 'That link is not a direct image' }),
    } as Response)
    const onChange = vi.fn()
    render(<CoverImageInput name="cover_image_url" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/photo.jpg'))
    expect(screen.getByText(/not a direct image/i)).toBeInTheDocument()
  })

  it('shows error for invalid URL', () => {
    render(<CoverImageInput name="cover_image_url" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(screen.getByText(/valid URL/i)).toBeInTheDocument()
  })

  it('profile photos are upload-only: no paste-a-link option', () => {
    render(<CoverImageInput name="avatar_url" uploadType="avatar" />)
    expect(screen.getByText(/click to upload/i)).toBeInTheDocument()
    expect(screen.queryByText('Use URL')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(/https:\/\/example\.com\/image/i)).not.toBeInTheDocument()
  })

  it('cover images still offer the link option', () => {
    render(<CoverImageInput name="cover_image_url" />)
    expect(screen.getByText('Use URL')).toBeInTheDocument()
  })
})
