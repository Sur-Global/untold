import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { DashboardFilters } from '@/components/dashboard/DashboardFilters'

const replace = vi.fn()
let search = ''
vi.mock('@/i18n/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => '/dashboard' }))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }))

const labels = {
  searchPlaceholder: 'Buscar en mis títulos', searchLabel: 'Buscar en mi contenido', typeLabel: 'Tipo de contenido', all: 'Todo', statusLabel: 'Estado',
  published: 'Publicados', drafts: 'Borradores', sortLabel: 'Ordenar', sortNewest: 'Más recientes', sortOldest: 'Más antiguos', sortEdited: 'Editados hace poco',
  sortTitle: 'Título A–Z', clear: 'Limpiar filtros',
  types: { article: 'Artículos', video: 'Videos', podcast: 'Podcasts', pill: 'Píldoras', course: 'Cursos' },
}
const props = { labels, types: [{ id: 'article', count: 30 }, { id: 'video', count: 4 }], counts: { all: 34, published: 20, draft: 14 } }

describe('DashboardFilters ("Mi contenido")', () => {
  beforeEach(() => { vi.clearAllMocks(); search = ''; vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('shows only the kinds of content the creator has, with how many of each', () => {
    render(<DashboardFilters {...props} />)
    expect(screen.getByRole('button', { name: 'Todo (34)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Artículos (30)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Videos (4)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Podcasts/ })).not.toBeInTheDocument()
  })

  it('puts the chosen kind and status in the address, and "Todo" takes them out', () => {
    render(<DashboardFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Videos (4)' }))
    expect(replace).toHaveBeenLastCalledWith('/dashboard?type=video', { scroll: false })
    fireEvent.click(screen.getByRole('button', { name: 'Borradores (14)' }))
    expect(replace).toHaveBeenLastCalledWith('/dashboard?status=draft', { scroll: false })
  })

  it('keeps the other filters when one changes, and goes back to the first page', () => {
    search = 'type=video&limit=50'
    render(<DashboardFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Borradores (14)' }))
    expect(replace).toHaveBeenLastCalledWith('/dashboard?type=video&status=draft', { scroll: false })
  })

  it('sorts by date or title (newest first is the default and leaves the address clean)', () => {
    render(<DashboardFilters {...props} />)
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'title' } })
    expect(replace).toHaveBeenLastCalledWith('/dashboard?sort=title', { scroll: false })
    fireEvent.change(screen.getByLabelText('Ordenar'), { target: { value: 'newest' } })
    expect(replace).toHaveBeenLastCalledWith('/dashboard', { scroll: false })
  })

  it('waits for the person to stop typing before searching', () => {
    render(<DashboardFilters {...props} />)
    fireEvent.change(screen.getByLabelText('Buscar en mi contenido'), { target: { value: 'futuros' } })
    expect(replace).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(350) })
    expect(replace).toHaveBeenLastCalledWith('/dashboard?q=futuros', { scroll: false })
  })

  it('offers to clear the filters only when there are some', () => {
    const { unmount } = render(<DashboardFilters {...props} />)
    expect(screen.queryByRole('button', { name: 'Limpiar filtros' })).not.toBeInTheDocument()
    unmount()
    search = 'type=video'
    render(<DashboardFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))
    expect(replace).toHaveBeenLastCalledWith('/dashboard', { scroll: false })
  })

  it('hides the kind and status buttons for a creator with a single kind and status', () => {
    render(<DashboardFilters {...props} types={[{ id: 'article', count: 5 }]} counts={{ all: 5, published: 5, draft: 0 }} />)
    expect(screen.queryByRole('button', { name: /Artículos/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Borradores/ })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Ordenar')).toBeInTheDocument()
  })
})
