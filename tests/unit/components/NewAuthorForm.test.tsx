import { render } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-intl', () => ({ useTranslations: () => (key: string) => key, useLocale: () => 'es' }))
vi.mock('@blocknote/core', () => ({ BlockNoteSchema: { create: () => ({}) } }))
vi.mock('@blocknote/react', () => ({ useCreateBlockNote: () => ({}) }))
vi.mock('@blocknote/xl-multi-column', () => ({ withMultiColumn: (s: unknown) => s }))
vi.mock('@/lib/actions/author', () => ({ createAuthor: vi.fn() }))
vi.mock('@/lib/countries', () => ({ countryOptions: () => [] }))
vi.mock('@/components/editor/RichTextEditorLazy', () => ({ RichTextEditor: () => null }))

const photoInputs: Array<Record<string, unknown>> = []
vi.mock('@/components/ui/CoverImageInput', () => ({
  CoverImageInput: (props: Record<string, unknown>) => {
    photoInputs.push(props)
    return null
  },
}))

import { NewAuthorForm } from '@/components/content/NewAuthorForm'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

describe('NewAuthorForm photo', () => {
  beforeEach(() => {
    photoInputs.length = 0
  })

  it('stores each new author’s photo under an id of its own, so one author’s photo never replaces another’s', () => {
    const first = render(<NewAuthorForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const second = render(<NewAuthorForm onCreated={vi.fn()} onCancel={vi.fn()} />)

    const [a, b] = [photoInputs[0], photoInputs[photoInputs.length - 1]]
    expect(a.uploadType).toBe('avatar')
    expect(String(a.ownerId)).toMatch(UUID)
    expect(String(b.ownerId)).toMatch(UUID)
    expect(a.ownerId).not.toBe(b.ownerId)
    first.unmount()
    second.unmount()
  })

  it('keeps the same id while the form stays open (changing the photo replaces that author’s own file only)', () => {
    const { rerender } = render(<NewAuthorForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    rerender(<NewAuthorForm onCreated={vi.fn()} onCancel={vi.fn()} />)
    const ids = new Set(photoInputs.map((p) => p.ownerId))
    expect(ids.size).toBe(1)
  })
})
