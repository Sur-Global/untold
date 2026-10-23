import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { PillContentFields } from '@/components/pills/PillContentFields'
import { PILL_DESCRIPTION_MAX } from '@/lib/pill-slides'

vi.mock('next-intl', () => ({
  useLocale: () => 'es',
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key} ${Object.values(values).join(' ')}` : key),
}))
vi.mock('@/components/pills/SlidesEditor', () => ({ SlidesEditor: () => <div data-testid="slides-editor" /> }))
vi.mock('@/components/ui/TagsInput', () => ({ TagsInput: () => <div data-testid="tags-input" /> }))
vi.mock('@/components/editor/RichTextEditorLazy', () => ({ RichTextEditor: () => <div data-testid="rich-text" /> }))
vi.mock('@/components/ui/CoverImageInput', () => ({ CoverImageInput: () => <div data-testid="cover-input" /> }))

function Harness({ initial = '' }: { initial?: string }) {
  const [description, setDescription] = useState(initial)
  return (
    <PillContentFields
      format="carousel" onFormatChange={() => {}} slides={[]} onSlidesChange={() => {}}
      description={description} onDescriptionChange={setDescription}
      body={null} onBodyChange={() => {}} tags={[]} onTagsChange={() => {}}
    />
  )
}

describe('carousel description field', () => {
  it('shows how many characters are left, and counts down as the person writes', () => {
    render(<Harness />)
    const counter = () => document.querySelector('[data-description-counter]')!.textContent
    expect(counter()).toBe(`descriptionCharsLeft ${PILL_DESCRIPTION_MAX}`)
    fireEvent.change(screen.getByLabelText('carouselDescriptionLabel'), { target: { value: 'Hola mundo' } })
    expect(counter()).toBe(`descriptionCharsLeft ${PILL_DESCRIPTION_MAX - 10}`)
  })

  it('grows to show all of the text, with no scrolling inside the box', () => {
    const scrollHeight = vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(210)
    render(<Harness initial={'Una línea larga. '.repeat(20)} />)
    const box = screen.getByLabelText('carouselDescriptionLabel') as HTMLTextAreaElement
    expect(box.style.height).toBe('210px')
    expect(box.style.overflow).toBe('hidden')
    expect(box).toHaveAttribute('maxlength', String(PILL_DESCRIPTION_MAX))
    scrollHeight.mockRestore()
  })
})
