import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TopicsForm, type TopicRow } from '@/components/admin/TopicsForm'
import { saveTopicDetails, setTagTopic } from '@/lib/actions/topics'

vi.mock('@/lib/actions/topics', () => ({ setTagTopic: vi.fn(), saveTopicDetails: vi.fn() }))

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

  it('only a topic has a page to edit: its sentence (with the characters left) and its picture', () => {
    render(<TopicsForm initial={[{ ...rows[0], description: 'Escenarios y estrategias.' }, rows[1]]} />)
    expect(screen.queryByRole('button', { name: 'Edit the page of AI' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page of Futuros' }))
    expect(screen.getByLabelText(/Sentence about the topic/)).toHaveValue('Escenarios y estrategias.')
    expect(screen.getByText(/215 characters left/)).toBeInTheDocument()
    expect(screen.getByText('Picture (optional)')).toBeInTheDocument()
  })

  it('saves the sentence and the picture, and says they were translated', async () => {
    vi.mocked(saveTopicDetails).mockResolvedValue({ ok: true, translated: true })
    render(<TopicsForm initial={rows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page of Futuros' }))
    fireEvent.change(screen.getByLabelText(/Sentence about the topic/), { target: { value: 'Otros mañanas posibles.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save topic page' }))
    await waitFor(() => expect(saveTopicDetails).toHaveBeenCalledWith('t1', { description: 'Otros mañanas posibles.', imageUrl: '' }))
    expect(await screen.findByText('Saved and translated to the other languages.')).toBeInTheDocument()
  })

  it('says so when the sentence could be saved but not translated', async () => {
    vi.mocked(saveTopicDetails).mockResolvedValue({ ok: true, translated: false })
    render(<TopicsForm initial={rows} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit the page of Futuros' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save topic page' }))
    expect(await screen.findByText(/Saved in Spanish\. The translation was not possible now/)).toBeInTheDocument()
  })

  it('warns when there are too many topics for one row', () => {
    const many = Array.from({ length: 17 }, (_, i) => ({ id: `t${i}`, slug: `s${i}`, name: `Tema ${i}`, count: i, isTopic: true }))
    render(<TopicsForm initial={many} />)
    expect(screen.getByRole('status')).toHaveTextContent(/more than 16 is too many/)
  })
})
