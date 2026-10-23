import { render, screen, fireEvent, within } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SlidesEditor } from '@/components/pills/SlidesEditor'
import { MAX_SLIDES, type PillSlide } from '@/lib/pill-slides'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))

const slide = (id: string, extra: Partial<PillSlide> = {}): PillSlide => ({ id, kind: 'photo', image_url: `https://cdn/${id}.webp`, text: `Texto ${id}`, credit: '', logo: 'auto', logo_color: null, ...extra })

describe('SlidesEditor', () => {
  it('adds a photo slide, a text slide on lilac and a finished image', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[]} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'addPhotoSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'photo', logo: 'auto' })])
    fireEvent.click(screen.getByRole('button', { name: 'addTextSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'text', logo: 'white' })])
    fireEvent.click(screen.getByRole('button', { name: 'addImageSlide' }))
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ kind: 'image', logo: 'none' })])
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

  it('lets the person choose the logo colour of a photo', () => {
    const onChange = vi.fn()
    render(<SlidesEditor slides={[slide('a')]} onChange={onChange} />)
    const select = screen.getByLabelText('slideLogoLabel')
    expect(within(select).getAllByRole('option').map((o) => o.getAttribute('value'))).toEqual(['auto', 'white', 'black', 'none'])
    fireEvent.change(select, { target: { value: 'black' } })
    expect(onChange).toHaveBeenLastCalledWith([expect.objectContaining({ logo: 'black', logo_color: null })])
  })

  it('stops adding slides at the limit', () => {
    const many = Array.from({ length: MAX_SLIDES }, (_, n) => slide(`s${n}`))
    render(<SlidesEditor slides={many} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'addPhotoSlide' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /uploadManyPhotos/ })).toBeDisabled()
  })
})
