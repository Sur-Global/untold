import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TranslationsPanel } from '@/components/translations/TranslationsPanel'
import type { TranslationEditorData } from '@/lib/translation-editor'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))
const refresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }))
vi.mock('@/components/editor/RichTextEditorLazy', () => ({ RichTextEditor: () => <div data-testid="rich-text" /> }))
const actions = vi.hoisted(() => ({ saveTranslation: vi.fn(), translateAgain: vi.fn(), markTranslationReviewed: vi.fn() }))
vi.mock('@/lib/actions/translations', () => actions)

const data = (extra: Partial<TranslationEditorData> = {}): TranslationEditorData => ({
  contentId: 'c1',
  sourceLocale: 'es',
  source: { title: 'Título original', summary: 'Descripción original', body: null, slides: [{ id: 's1', text: 'Uno' }, { id: 's2', text: 'Dos' }] },
  fields: { summary: true, body: false, slides: true },
  shortOnly: false,
  locales: [
    { locale: 'en', status: 'auto', title: 'Original title', summary: 'Original description', body: null, slides: [{ id: 's1', text: 'One' }, { id: 's2', text: 'Two' }] },
    { locale: 'pt', status: 'review', title: 'Título pt', summary: 'Descrição', body: null, slides: [{ id: 's1', text: 'Um' }, { id: 's2', text: '' }] },
    { locale: 'fr', status: 'pending', title: '', summary: '', body: null, slides: [{ id: 's1', text: '' }, { id: 's2', text: '' }] },
  ],
  ...extra,
})

describe('TranslationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    actions.saveTranslation.mockResolvedValue(undefined)
    actions.translateAgain.mockResolvedValue(undefined)
    actions.markTranslationReviewed.mockResolvedValue(undefined)
    vi.stubGlobal('confirm', vi.fn(() => true))
    window.confirm = vi.fn(() => true)
  })

  it('has a tab for each language but the original, with its status, and opens the one that needs review first', () => {
    render(<TranslationsPanel data={data()} />)
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Englishstatus.auto', 'Portuguêsstatus.review', 'Françaisstatus.pending'])
    expect(screen.getByRole('tab', { selected: true }).textContent).toContain('Português')
    expect(screen.getByText('reviewNotice')).toBeInTheDocument()
  })

  it('shows what the original says under each field', () => {
    render(<TranslationsPanel data={data()} />)
    expect(screen.getByText(/original: Título original/)).toBeInTheDocument()
    expect(screen.getByText(/original: Descripción original/)).toBeInTheDocument()
    expect(screen.getByText(/original: Uno/)).toBeInTheDocument()
  })

  it('saves what was corrected as a manual translation, with the title, the description and the slide texts', async () => {
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('tab', { name: /English/ }))
    fireEvent.change(screen.getByLabelText('titleLabel'), { target: { value: 'Corrected title' } })
    fireEvent.change(screen.getByLabelText('slideLabel 1'), { target: { value: 'Uno corregido' } })
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    await waitFor(() => expect(actions.saveTranslation).toHaveBeenCalledWith('c1', 'en', {
      title: 'Corrected title',
      summary: 'Original description',
      slides: [{ id: 's1', text: 'Uno corregido' }, { id: 's2', text: 'Two' }],
    }))
    expect(await screen.findByRole('status')).toHaveTextContent('saved')
    expect(screen.getByRole('tab', { name: /English/ }).textContent).toContain('status.manual')
    expect(refresh).toHaveBeenCalled()
  })

  it('does not save without a title', () => {
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('tab', { name: /Français/ }))
    fireEvent.click(screen.getByRole('button', { name: 'save' }))
    expect(actions.saveTranslation).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('emptyTitle')
  })

  it('marks a translation to review as reviewed without changing it', async () => {
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('button', { name: 'markReviewed' }))
    await waitFor(() => expect(actions.markTranslationReviewed).toHaveBeenCalledWith('c1', 'pt'))
    expect(screen.getByRole('tab', { name: /Português/ }).textContent).toContain('status.manual')
  })

  it('translates a language automatically again, after asking when there was a correction by hand', async () => {
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('button', { name: 'translateAgain' }))
    expect(window.confirm).toHaveBeenCalledWith('translateAgainConfirm')
    await waitFor(() => expect(actions.translateAgain).toHaveBeenCalledWith('c1', 'pt'))
    expect(screen.getByRole('tab', { name: /Português/ }).textContent).toContain('status.auto')
  })

  it('does not translate again when the person says no', () => {
    window.confirm = vi.fn(() => false)
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('button', { name: 'translateAgain' }))
    expect(actions.translateAgain).not.toHaveBeenCalled()
  })

  it('a language without translation offers to translate it now, without asking', async () => {
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('tab', { name: /Français/ }))
    expect(screen.getByText('pendingNotice')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'translateNow' }))
    expect(window.confirm).not.toHaveBeenCalled()
    await waitFor(() => expect(actions.translateAgain).toHaveBeenCalledWith('c1', 'fr'))
  })

  it('shows the error when an action fails', async () => {
    actions.translateAgain.mockRejectedValue(new Error('DeepL translation quota exceeded'))
    render(<TranslationsPanel data={data()} />)
    fireEvent.click(screen.getByRole('tab', { name: /Français/ }))
    fireEvent.click(screen.getByRole('button', { name: 'translateNow' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('quota exceeded')
  })

  it('shows only the fields this content has, and says when only the title and a short description are translated', () => {
    render(<TranslationsPanel data={data({ fields: { summary: true, body: false, slides: false }, shortOnly: true })} />)
    expect(screen.getByText('shortOnlyNote')).toBeInTheDocument()
    expect(screen.queryByText('slidesLabel')).toBeNull()
    expect(screen.queryByTestId('rich-text')).toBeNull()
    expect(within(screen.getByRole('tabpanel')).getByLabelText('summaryLabel')).toBeInTheDocument()
  })

  it('shows the text editor for content that has a translated text', () => {
    render(<TranslationsPanel data={data({ fields: { summary: false, body: true, slides: false } })} />)
    expect(screen.getByTestId('rich-text')).toBeInTheDocument()
  })

  it('shows nothing when there is no other language', () => {
    const { container } = render(<TranslationsPanel data={data({ locales: [] })} />)
    expect(container).toBeEmptyDOMElement()
  })
})
