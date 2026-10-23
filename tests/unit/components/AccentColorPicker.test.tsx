import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { AccentColorPicker } from '@/components/pills/AccentColorPicker'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))

describe('AccentColorPicker', () => {
  it('offers only the seven brand colours', () => {
    render(<AccentColorPicker />)
    const options = screen.getAllByRole('radio')
    expect(options.map((o) => o.getAttribute('data-accent'))).toEqual(['#000000', '#F1F1F1', '#A1A1E9', '#D2FE73', '#FF470D', '#FFEB55', '#9A3130'])
    expect(document.querySelector('input[type="color"]')).toBeNull()
  })
  it('starts on lavender when the pill has no colour, or one that is not a brand colour', () => {
    const { container } = render(<AccentColorPicker defaultValue="#C45D3A" />)
    expect(container.querySelector('input[name="accent_color"]')).toHaveValue('#A1A1E9')
  })
  it('starts on the colour the pill has and submits the one that is chosen', () => {
    const { container } = render(<AccentColorPicker defaultValue="#ff470d" />)
    const field = container.querySelector('input[name="accent_color"]') as HTMLInputElement
    expect(field.value).toBe('#FF470D')
    fireEvent.click(screen.getByRole('radio', { name: 'accent.lime' }))
    expect(field.value).toBe('#D2FE73')
    expect(screen.getByRole('radio', { name: 'accent.lime' })).toHaveAttribute('aria-checked', 'true')
  })
})
