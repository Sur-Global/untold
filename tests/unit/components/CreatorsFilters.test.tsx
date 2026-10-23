import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CreatorsFilters } from '@/components/creators/CreatorsFilters'
import { CreatorCard } from '@/components/creators/CreatorCard'

const replace = vi.fn()
let search = ''
vi.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ replace }),
  usePathname: () => '/creators',
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }))

const labels = {
  searchPlaceholder: 'Buscar por nombre', searchLabel: 'Buscar creadores', sortLabel: 'Ordenar', sortAz: 'A–Z', sortContent: 'Más contenido', sortRecent: 'Más recientes',
  countryLabel: 'País', countryAll: 'Todos los países', topicLabel: 'Tema', topicAll: 'Todos los temas', letterLabel: 'Inicial', letterAll: 'Todas', clear: 'Quitar filtros',
}
const props = { labels, countries: [{ code: 'PE', name: 'Perú' }, { code: 'DK', name: 'Dinamarca' }], topics: [{ slug: 'ia', name: 'IA' }], letters: ['A', 'B', 'Z'] }

describe('CreatorsFilters', () => {
  beforeEach(() => { vi.clearAllMocks(); search = ''; vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('puts the chosen sort in the address, and A–Z (the default) leaves it out', () => {
    render(<CreatorsFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Más contenido' }))
    expect(replace).toHaveBeenLastCalledWith('/creators?sort=content', { scroll: false })
  })

  it('filters by country and topic', () => {
    render(<CreatorsFilters {...props} />)
    fireEvent.change(screen.getByLabelText('País'), { target: { value: 'PE' } })
    expect(replace).toHaveBeenLastCalledWith('/creators?country=PE', { scroll: false })
    fireEvent.change(screen.getByLabelText('Tema'), { target: { value: 'ia' } })
    expect(replace).toHaveBeenLastCalledWith('/creators?tag=ia', { scroll: false })
  })

  it('waits for the person to stop typing before searching', () => {
    render(<CreatorsFilters {...props} />)
    fireEvent.change(screen.getByLabelText('Buscar creadores'), { target: { value: 'ali' } })
    expect(replace).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(350) })
    expect(replace).toHaveBeenCalledWith('/creators?q=ali', { scroll: false })
  })

  it('jumps to a letter, and clicking it again clears it', () => {
    const { unmount } = render(<CreatorsFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(replace).toHaveBeenLastCalledWith('/creators?letter=B', { scroll: false })
    unmount()
    search = 'letter=B'
    render(<CreatorsFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'B' }))
    expect(replace).toHaveBeenLastCalledWith('/creators', { scroll: false })
  })

  it('offers “clear filters” only when something is filtered', () => {
    const { unmount } = render(<CreatorsFilters {...props} />)
    expect(screen.queryByRole('button', { name: 'Quitar filtros' })).not.toBeInTheDocument()
    unmount()
    search = 'country=PE'
    render(<CreatorsFilters {...props} />)
    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtros' }))
    expect(replace).toHaveBeenLastCalledWith('/creators', { scroll: false })
  })

  it('hides the country and topic choices when nobody has them', () => {
    render(<CreatorsFilters {...props} countries={[]} topics={[]} />)
    expect(screen.queryByLabelText('País')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tema')).not.toBeInTheDocument()
  })
})

describe('CreatorCard', () => {
  it('links to the creator’s own profile and shows what they published', () => {
    render(<CreatorCard slug="aliza-yanes" name="Aliza Yanes" avatarUrl={null} country="Alemania" bio="Escritora y mediadora de arte." countsLabel="2 artículos · 1 video" />)
    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/author/aliza-yanes')
    expect(screen.getByRole('heading', { name: 'Aliza Yanes' })).toBeInTheDocument()
    expect(screen.getByText('Alemania')).toBeInTheDocument()
    expect(screen.getByText('2 artículos · 1 video')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument() // initial, while there is no photo
  })
})
