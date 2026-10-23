import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { IssueForm } from '@/components/admin/IssueForm'
import { saveIssue } from '@/lib/actions/issues'

const push = vi.fn()
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ push }) }))
vi.mock('@/lib/actions/issues', () => ({ saveIssue: vi.fn(), deleteIssue: vi.fn() }))

const articles = [
  { id: 'a1', title: 'Viejos mitos, nuevas amenazas', authorName: 'Javier Wong Q', publishedAt: '2026-09-13T10:00:00Z', issueLabel: null },
  { id: 'a2', title: 'La mano que mueve la pluma', authorName: 'Carlos Fuller Maúrtua', publishedAt: '2026-09-04T10:00:00Z', issueLabel: 'Jun 2026' },
  { id: 'a3', title: 'Justicia lingüística y el giro pluriversal', authorName: 'Yecid Ortega', publishedAt: '2026-08-13T10:00:00Z', issueLabel: null },
]
const initial = { id: null, month: '2026-10', published: false, editorialId: null, articleIds: [] as string[] }

describe('IssueForm (Admin → Issues)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('asks only for the month (no issue number), and lists the articles with the issue they are in', () => {
    render(<IssueForm initial={initial} articles={articles} />)
    expect(screen.queryByLabelText('Issue number')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Month of the issue')).toHaveValue('2026-10')
    expect(screen.getByText('Viejos mitos, nuevas amenazas')).toBeInTheDocument()
    expect(screen.getByText('in issue Jun 2026')).toBeInTheDocument()
  })

  it('finds articles by title or author', () => {
    render(<IssueForm initial={initial} articles={articles} />)
    fireEvent.change(screen.getByLabelText('Search articles'), { target: { value: 'fuller' } })
    expect(screen.getByText('La mano que mueve la pluma')).toBeInTheDocument()
    expect(screen.queryByText('Viejos mitos, nuevas amenazas')).not.toBeInTheDocument()
  })

  it('can hide the articles already in another issue', () => {
    render(<IssueForm initial={initial} articles={articles} />)
    fireEvent.click(screen.getByLabelText('Hide articles that are already in another issue'))
    expect(screen.queryByText('La mano que mueve la pluma')).not.toBeInTheDocument()
    expect(screen.getByText('Justicia lingüística y el giro pluriversal')).toBeInTheDocument()
  })

  it('picking the editorial also puts that article in the issue, and saves everything chosen', async () => {
    vi.mocked(saveIssue).mockResolvedValue({ ok: true, id: 'i1' })
    render(<IssueForm initial={initial} articles={articles} />)
    fireEvent.click(screen.getByLabelText('Editorial: Viejos mitos, nuevas amenazas'))
    expect(screen.getByLabelText('In this issue: Viejos mitos, nuevas amenazas')).toBeChecked()
    fireEvent.click(screen.getByLabelText('In this issue: Justicia lingüística y el giro pluriversal'))
    fireEvent.click(screen.getByRole('checkbox', { name: /^Published/ }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Save issue' })[0])
    await waitFor(() => expect(saveIssue).toHaveBeenCalled())
    expect(vi.mocked(saveIssue).mock.calls[0][0]).toEqual({
      id: null, month: '2026-10', published: true, editorialId: 'a1', articleIds: expect.arrayContaining(['a1', 'a3']),
    })
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/issues'))
  })

  it('unticking the editorial article clears the editorial', async () => {
    vi.mocked(saveIssue).mockResolvedValue({ ok: true, id: 'i1' })
    render(<IssueForm initial={{ ...initial, editorialId: 'a1', articleIds: ['a1'] }} articles={articles} />)
    fireEvent.click(screen.getByLabelText('In this issue: Viejos mitos, nuevas amenazas'))
    fireEvent.click(screen.getAllByRole('button', { name: 'Save issue' })[0])
    await waitFor(() => expect(saveIssue).toHaveBeenCalled())
    expect(vi.mocked(saveIssue).mock.calls[0][0]).toMatchObject({ editorialId: null, articleIds: [] })
  })

  it('shows the reason when saving fails and stays on the page', async () => {
    vi.mocked(saveIssue).mockResolvedValue({ ok: false, error: 'There is already an issue for October 2026.' })
    render(<IssueForm initial={initial} articles={articles} />)
    fireEvent.click(screen.getAllByRole('button', { name: 'Save issue' })[0])
    expect(await screen.findByText('There is already an issue for October 2026.')).toBeInTheDocument()
    expect(push).not.toHaveBeenCalled()
  })
})
