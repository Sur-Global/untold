import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TopicsForm, type TopicRow } from '@/components/admin/TopicsForm'
import { setTagTopic } from '@/lib/actions/topics'

vi.mock('@/lib/actions/topics', () => ({ setTagTopic: vi.fn() }))

const rows: TopicRow[] = [
  { id: 't1', slug: 'futuros', name: 'Futuros', count: 33, isTopic: true },
  { id: 't2', slug: 'ai', name: 'AI', count: 4, isTopic: false },
]

describe('TopicsForm (Admin → Topics)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('lists the tags with their content and which ones are topics', () => {
    render(<TopicsForm initial={rows} />)
    expect(screen.getByText('Futuros')).toBeInTheDocument()
    expect(screen.getByText('/tag/ai')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Futuros is a topic' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'AI is a topic' })).not.toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('1 topic')
  })

  it('makes a tag a topic as it is ticked, and counts it', async () => {
    vi.mocked(setTagTopic).mockResolvedValue({ ok: true })
    render(<TopicsForm initial={rows} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'AI is a topic' }))
    await waitFor(() => expect(setTagTopic).toHaveBeenCalledWith('t2', true))
    expect(screen.getByRole('status')).toHaveTextContent('2 topics')
  })

  it('goes back and says why when it cannot save', async () => {
    vi.mocked(setTagTopic).mockResolvedValue({ ok: false, error: 'permission denied' })
    render(<TopicsForm initial={rows} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Futuros is a topic' }))
    expect(await screen.findByText('permission denied')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Futuros is a topic' })).toBeChecked()
  })

  it('warns when there are too many topics for one row', () => {
    const many = Array.from({ length: 17 }, (_, i) => ({ id: `t${i}`, slug: `s${i}`, name: `Tema ${i}`, count: i, isTopic: true }))
    render(<TopicsForm initial={many} />)
    expect(screen.getByRole('status')).toHaveTextContent(/more than 16 is too many/)
  })
})
