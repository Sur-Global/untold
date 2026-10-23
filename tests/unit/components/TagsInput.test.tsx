import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TagsInput } from '@/components/ui/TagsInput'

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))
const ensureTag = vi.fn()
vi.mock('@/lib/actions/tags', () => ({ ensureTag: (...args: unknown[]) => ensureTag(...args) }))

describe('TagsInput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({ json: async () => [{ id: 't1', slug: 'decolonialidad', name: 'Decolonialidad' }] })) as any
  })

  it('asks for suggestions in the language of the session and shows them in it', async () => {
    render(<TagsInput value={[]} onChange={vi.fn()} placeholder="Temas" />)
    fireEvent.change(screen.getByPlaceholderText('Temas'), { target: { value: 'decol' } })
    expect(await screen.findByText('Decolonialidad')).toBeInTheDocument()
    expect((global.fetch as any).mock.lastCall[0]).toBe('/api/tags?q=decol&locale=es')
  })

  it('creates a tag that does not exist in the language of the session, with its texts translated', async () => {
    ensureTag.mockResolvedValue({ id: 't2', slug: 'memoria', name: 'Memoria' })
    const onChange = vi.fn()
    render(<TagsInput value={[]} onChange={onChange} placeholder="Temas" />)
    fireEvent.change(screen.getByPlaceholderText('Temas'), { target: { value: 'Memoria' } })
    fireEvent.mouseDown(await screen.findByText('tagCreate Memoria'))
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([{ id: 't2', slug: 'memoria', name: 'Memoria' }]))
    expect(ensureTag).toHaveBeenCalledWith('Memoria', 'es')
  })

  it('labels the button that removes a tag in the language of the session', () => {
    render(<TagsInput value={[{ id: 't1', slug: 'a', name: 'Decolonialidad' }]} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'tagRemove Decolonialidad' })).toBeInTheDocument()
  })
})
