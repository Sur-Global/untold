import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SlidesEditor } from '@/components/pills/SlidesEditor'
import { MAX_SLIDES, type PillSlide } from '@/lib/pill-slides'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))

const slide = (id: string, extra: Partial<PillSlide> = {}): PillSlide => ({ id, kind: 'photo', image_url: `https://cdn/${id}.webp`, text: `Texto ${id}`, credit: '', brands: [], logo: 'auto', logo_color: null, ...extra })

describe('SlidesEditor', () => {
  it('adds a photo slide, a text slide on lilac and a finished image', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'addPhotoSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'photo', logo: 'auto', brands: [] })])
    fireEvent.click(screen.getByRole('button', { name: 'addTextSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'text', logo: 'white', brands: [] })])
    fireEvent.click(screen.getByRole('button', { name: 'addImageSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'image', brands: [] })])
  })

  it('edits the text and the credit of a slide', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[slide('a'), slide('b')]} onChange={onChange} />)
    fireEvent.change(screen.getAllByLabelText('slideOverlayTextLabel')[1], { target: { value: 'Nuevo título' } })
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'a' }), expect.objectContaining({ id: 'b', text: 'Nuevo título' })])
    fireEvent.change(screen.getAllByLabelText('slideCreditLabel')[0], { target: { value: 'Autora, fuente' } })
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'a', credit: 'Autora, fuente' }), expect.objectContaining({ id: 'b' })])
  })

  it('reorders and removes slides', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[slide('a'), slide('b'), slide('c')]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'moveSlideUp 2' }))
    expect(onChange.mock.lastCall![0].map((s: PillSlide) => s.id)).toEqual(['b', 'a', 'c'])
    fireEvent.click(screen.getByRole('button', { name: 'moveSlideDown 2' }))
    expect(onChange.mock.lastCall![0].map((s: PillSlide) => s.id)).toEqual(['a', 'c', 'b'])
    fireEvent.click(screen.getByRole('button', { name: 'removeSlide 1' }))
    expect(onChange.mock.lastCall![0].map((s: PillSlide) => s.id)).toEqual(['b', 'c'])
    expect(screen.getByRole('button', { name: 'moveSlideUp 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'moveSlideDown 3' })).toBeDisabled()
  })

  it('changing a slide to text removes its picture and gives it the white logo; text slides have no credit or logo choice', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[slide('a')]} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('slideKindLabel'), { target: { value: 'text' } })
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'text', image_url: null, logo: 'white' })])
  })

  it('shows no logo option to a regular creator', () => {
    render(<SlidesEditor slides={[slide('a'), slide('b', { kind: 'text', image_url: null })]} onChange={vi.fn()} />)
    expect(screen.queryByText('slideLogoLabel')).toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(screen.queryByLabelText('slideLogoColorLabel')).toBeNull()
  })

  describe('for admins and editors', () => {
    it('starts picture and text slides with the UNTOLD logo, and finished images with none', () => {
      const onChange = vi.fn()
      render(<SlidesEditor slides={[]} onChange={onChange} brandLogos />)
      fireEvent.click(screen.getByRole('button', { name: 'addPhotoSlide' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'photo', brands: ['untold'] })])
      fireEvent.click(screen.getByRole('button', { name: 'addTextSlide' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'text', brands: ['untold'] })])
      fireEvent.click(screen.getByRole('button', { name: 'addImageSlide' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'image', brands: [] })])
    })

    it('chooses the UNTOLD and / or SurGlobal logo of a slide', () => {
      const onChange = vi.fn()
      render(<SlidesEditor slides={[slide('a', { brands: ['untold'] })]} onChange={onChange} brandLogos />)
      expect(screen.getByRole('checkbox', { name: 'UNTOLD' })).toBeChecked()
      expect(screen.getByRole('checkbox', { name: 'SurGlobal' })).not.toBeChecked()
      fireEvent.click(screen.getByRole('checkbox', { name: 'SurGlobal' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ brands: ['untold', 'surglobal'], logo_color: null })])
      fireEvent.click(screen.getByRole('checkbox', { name: 'UNTOLD' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ brands: [] })])
    })

    it('lets them choose the logo colour of a picture that has a logo, but not of lilac slides', () => {
      const onChange = vi.fn()
      const { rerender } = render(<SlidesEditor slides={[slide('a', { brands: ['untold'] })]} onChange={onChange} brandLogos />)
      const select = screen.getByLabelText('slideLogoColorLabel')
      expect(within(select).getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual(['auto', 'white', 'black'])
      fireEvent.change(select, { target: { value: 'black' } })
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ logo: 'black', logo_color: null })])
      rerender(<SlidesEditor slides={[slide('a', { brands: [] })]} onChange={onChange} brandLogos />)
      expect(screen.queryByLabelText('slideLogoColorLabel')).toBeNull()
      rerender(<SlidesEditor slides={[slide('a', { kind: 'text', image_url: null, logo: 'white', brands: ['untold'] })]} onChange={onChange} brandLogos />)
      expect(screen.queryByLabelText('slideLogoColorLabel')).toBeNull()
      expect(screen.getByText('slideLogoLilacNote')).toBeInTheDocument()
    })
  })

  it('stops adding slides at the limit', () => {
    const many = Array.from({ length: MAX_SLIDES }, (_, n) => slide(`s${n}`))
    render(<SlidesEditor slides={many} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'addPhotoSlide' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /uploadManyPhotos/ })).toBeDisabled()
  })
})
