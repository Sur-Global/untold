import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { CollapsiblePanel } from '@/components/admin/CollapsiblePanel'

const panel = (extra: Partial<React.ComponentProps<typeof CollapsiblePanel>> = {}) => (
  <CollapsiblePanel storageKey="legend-test" title="Placement slots" summary="★ its own page · ⌂ homepage section · ↑ hero" {...extra}>
    <p>Three buttons on each published item…</p>
  </CollapsiblePanel>
)

describe('CollapsiblePanel (the placement legend in Admin → Content)', () => {
  // a plain in-memory stand-in for the browser's storage
  const original = Object.getOwnPropertyDescriptor(window, 'localStorage')
  const useStorage = (storage: Partial<Storage>) => Object.defineProperty(window, 'localStorage', { value: storage, configurable: true })
  let memory: Record<string, string>
  beforeEach(() => {
    memory = {}
    useStorage({ getItem: (k: string) => memory[k] ?? null, setItem: (k: string, v: string) => { memory[k] = v } })
  })
  afterEach(() => {
    if (original) Object.defineProperty(window, 'localStorage', original)
  })

  it('starts with the long text hidden, keeping the title and a one-line summary', () => {
    render(panel())
    expect(screen.getByText('Placement slots')).toBeInTheDocument()
    expect(screen.getByText('★ its own page · ⌂ homepage section · ↑ hero')).toBeInTheDocument()
    expect(screen.getByText('Three buttons on each published item…')).not.toBeVisible()
    expect(screen.getByRole('button', { name: 'Show details' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows and hides the text with the button', () => {
    render(panel())
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))
    expect(screen.getByText('Three buttons on each published item…')).toBeVisible()
    expect(screen.queryByText('★ its own page · ⌂ homepage section · ↑ hero')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hide details' }))
    expect(screen.getByText('Three buttons on each published item…')).not.toBeVisible()
  })

  it('remembers the choice in this browser', () => {
    const first = render(panel())
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))
    first.unmount()
    render(panel())
    expect(screen.getByRole('button', { name: 'Hide details' })).toBeInTheDocument()
    expect(screen.getByText('Three buttons on each published item…')).toBeVisible()
  })

  it('still works when the browser blocks storage', () => {
    useStorage({ getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } })
    render(panel())
    fireEvent.click(screen.getByRole('button', { name: 'Show details' }))
    expect(screen.getByText('Three buttons on each published item…')).toBeVisible()
  })
})
