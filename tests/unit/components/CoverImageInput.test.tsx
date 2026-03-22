import { render, screen, fireEvent } from '@testing-library/react'
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

  it('sets url from URL input when Use URL is clicked', () => {
    render(<CoverImageInput name="cover_image_url" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(screen.getByRole('img')).toBeInTheDocument()
  })

  it('shows error for invalid URL', () => {
    render(<CoverImageInput name="cover_image_url" />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'not-a-url' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(screen.getByText(/valid URL/i)).toBeInTheDocument()
  })

  it('calls onChange when url changes via URL input', () => {
    const onChange = vi.fn()
    render(<CoverImageInput name="cover_image_url" onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText(/https:\/\/example\.com\/image/i), {
      target: { value: 'https://cdn.example.com/photo.jpg' },
    })
    fireEvent.click(screen.getByText('Use URL'))
    expect(onChange).toHaveBeenCalledWith('https://cdn.example.com/photo.jpg')
  })
})
