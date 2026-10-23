import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SlidesEditor } from '@/components/pills/SlidesEditor'
import { MAX_SLIDES, type PillSlide, TEXT_DEFAULTS } from '@/lib/pill-slides'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))

const slide = (id: string, extra: Partial<PillSlide> = {}): PillSlide => ({ id, kind: 'photo', image_url: `https://cdn/${id}.webp`, text: `Texto ${id}`, credit: '', ...TEXT_DEFAULTS, brands: [], logo: 'auto', logo_color: null, ...extra })

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

  describe('the place, size and colour of the text over a photo', () => {
    it('are chosen for photo slides, by anyone', () => {
      const onChange = vi.fn()
      render(<SlidesEditor slides={[slide('a')]} onChange={onChange} />)
      expect(screen.getAllByRole('radio', { name: /^textPos\./ })).toHaveLength(9)
      fireEvent.click(screen.getByRole('radio', { name: 'textPos.topRight' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ text_x: 'right', text_y: 'top' })])
      fireEvent.click(screen.getByRole('radio', { name: 'textSize.xl' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ text_size: 'xl' })])
      fireEvent.click(screen.getByRole('radio', { name: 'textColor.black' }))
      expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ text_color: 'black' })])
    })
    it('show what the slide has now', () => {
      render(<SlidesEditor slides={[slide('a', { text_x: 'center', text_y: 'middle', text_size: 'l', text_color: 'black' })]} onChange={vi.fn()} />)
      expect(screen.getByRole('radio', { name: 'textPos.middleCenter' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'textPos.bottomLeft' })).toHaveAttribute('aria-checked', 'false')
      expect(screen.getByRole('radio', { name: 'textSize.l' })).toHaveAttribute('aria-checked', 'true')
      expect(screen.getByRole('radio', { name: 'textColor.black' })).toHaveAttribute('aria-checked', 'true')
    })
    it('are not offered on lilac slides or finished images, which have no text over a photo', () => {
      render(<SlidesEditor slides={[slide('a', { kind: 'text', image_url: null }), slide('b', { kind: 'image' })]} onChange={vi.fn()} />)
      expect(screen.queryAllByRole('radio', { name: /^textPos\./ })).toHaveLength(0)
    })
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
