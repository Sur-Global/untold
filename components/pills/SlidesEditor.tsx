'use client'

import { useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { ArrowDown, ArrowUp, ImagePlus, Trash2 } from 'lucide-react'
import { CoverImageInput, prepareImage } from '@/components/ui/CoverImageInput'
import { Button } from '@/components/ui/button'
import { MAX_SLIDES, newSlide, SLIDE_CREDIT_MAX, SLIDE_TEXT_MAX, type PillSlide, type SlideBrand, type SlideKind, type SlideLogo } from '@/lib/pill-slides'
import { SlideView } from '@/components/pills/SlideView'
import { TextPlacement, TextSlideStyle } from '@/components/pills/TextPlacement'

const fieldClass = 'w-full rounded-[10px] border border-primary/20 bg-white px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'
const labelClass = 'mb-1 block text-xs font-semibold text-foreground'
const BRAND_CHOICES: { brand: SlideBrand; name: string }[] = [
  { brand: 'untold', name: 'UNTOLD' },
  { brand: 'surglobal', name: 'SurGlobal' },
]

/** Uploads one picture the way the cover inputs do (shrunk first, then hosted by us) and gives back its address */
async function uploadPicture(file: File): Promise<string> {
  const fd = new FormData()
  fd.append('file', await prepareImage(file))
  fd.append('type', 'cover')
  const res = await fetch('/api/upload', { method: 'POST', body: fd })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Upload failed (${res.status})`)
  }
  return (await res.json()).url as string
}

/**
 * The slides of a carousel pill: add, reorder, remove, and fill in the picture, text and credit of each.
 * `brandLogos` (admins and editors only) also shows the choice of the UNTOLD and / or SurGlobal logo; everyone else sees no logo option.
 */
export function SlidesEditor({ slides, onChange, brandLogos = false }: { slides: PillSlide[]; onChange: (slides: PillSlide[]) => void; brandLogos?: boolean }) {
  const t = useTranslations('editor')
  const manyInput = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const update = (id: string, changes: Partial<PillSlide>) => onChange(slides.map((s) => (s.id === id ? { ...s, ...changes } : s)))
  const move = (index: number, by: -1 | 1) => {
    const target = index + by
    if (target < 0 || target >= slides.length) return
    const next = [...slides]
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }
  // Admins and editors start every picture and text slide with the UNTOLD logo; the rest start with none
  const startBrands = (kind: SlideKind): SlideBrand[] => (brandLogos && kind !== 'image' ? ['untold'] : [])
  const changeKind = (slide: PillSlide, kind: SlideKind) => {
    const fresh = newSlide(kind)
    update(slide.id, { kind, logo: fresh.logo, logo_color: null, image_url: kind === 'text' ? null : slide.image_url })
  }
  const toggleBrand = (slide: PillSlide, brand: SlideBrand, on: boolean) => {
    const chosen = new Set(slide.brands)
    if (on) chosen.add(brand)
    else chosen.delete(brand)
    update(slide.id, { brands: BRAND_CHOICES.map((c) => c.brand).filter((b) => chosen.has(b)), logo_color: null })
  }
  const add = (kind: SlideKind) => slides.length < MAX_SLIDES && onChange([...slides, newSlide(kind, startBrands(kind))])

  const addMany = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setError(null)
    const room = MAX_SLIDES - slides.length
    const list = Array.from(files).slice(0, room)
    const created: PillSlide[] = []
    for (let i = 0; i < list.length; i++) {
      setProgress({ done: i, total: list.length })
      try {
        created.push({ ...newSlide('photo', startBrands('photo')), image_url: await uploadPicture(list[i]) })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed')
        break
      }
    }
    setProgress(null)
    if (created.length > 0) onChange([...slides, ...created])
    if (manyInput.current) manyInput.current.value = ''
  }

  return (
    <div className="space-y-4">
      {slides.map((slide, i) => (
        <div key={slide.id} className="grid gap-4 rounded-[12px] border border-primary/20 bg-muted/20 p-4 sm:grid-cols-[120px_1fr]" data-slide={i + 1}>
          <div className="space-y-2">
            <SlideView slide={slide} />
            <p className="text-center text-[11px] text-muted-foreground">{t('slideNumber', { n: i + 1 })}</p>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label={t('slideKindLabel')}
                value={slide.kind}
                onChange={(e) => changeKind(slide, e.target.value as SlideKind)}
                className="h-9 rounded-[10px] border border-primary/20 bg-white px-3 text-sm"
              >
                <option value="photo">{t('slideKindPhoto')}</option>
                <option value="text">{t('slideKindText')}</option>
                <option value="image">{t('slideKindImage')}</option>
              </select>
              <div className="ml-auto flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, -1)} disabled={i === 0} aria-label={t('moveSlideUp', { n: i + 1 })}><ArrowUp size={16} aria-hidden /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => move(i, 1)} disabled={i === slides.length - 1} aria-label={t('moveSlideDown', { n: i + 1 })}><ArrowDown size={16} aria-hidden /></Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => onChange(slides.filter((s) => s.id !== slide.id))} aria-label={t('removeSlide', { n: i + 1 })}><Trash2 size={16} aria-hidden /></Button>
              </div>
            </div>

            {slide.kind !== 'text' && (
              <CoverImageInput
                key={`${slide.id}-${slide.kind}`}
                name={`slide-image-${slide.id}`}
                defaultValue={slide.image_url}
                label={t('slidePictureLabel')}
                previewAspect="4/5"
                sizeHint={t('slideImageHint')}
                onChange={(url) => update(slide.id, { image_url: url || null })}
              />
            )}

            {slide.kind !== 'image' && (
              <div>
                <label className={labelClass} htmlFor={`slide-text-${slide.id}`}>{slide.kind === 'text' ? t('slideTextLabel') : t('slideOverlayTextLabel')}</label>
                <textarea
                  id={`slide-text-${slide.id}`}
                  value={slide.text}
                  maxLength={SLIDE_TEXT_MAX}
                  rows={slide.kind === 'text' ? 5 : 2}
                  onChange={(e) => update(slide.id, { text: e.target.value })}
                  placeholder={slide.kind === 'text' ? t('slideTextPlaceholder') : t('slideOverlayPlaceholder')}
                  className={fieldClass}
                />
                {slide.kind === 'text' && <p className="mt-1 text-xs text-muted-foreground">{t('slideListHint')}</p>}
              </div>
            )}

            {slide.kind === 'photo' && <TextPlacement slide={slide} onChange={(changes) => update(slide.id, changes)} />}
            {slide.kind === 'text' && <TextSlideStyle slide={slide} onChange={(changes) => update(slide.id, changes)} />}

            {slide.kind !== 'text' && (
              <div>
                <label className={labelClass} htmlFor={`slide-credit-${slide.id}`}>{t('slideCreditLabel')}</label>
                <input
                  id={`slide-credit-${slide.id}`}
                  value={slide.credit}
                  maxLength={SLIDE_CREDIT_MAX}
                  onChange={(e) => update(slide.id, { credit: e.target.value })}
                  placeholder={t('slideCreditPlaceholder')}
                  className={fieldClass}
                />
              </div>
            )}

            {brandLogos && (
              <fieldset>
                <legend className={labelClass}>{t('slideLogoLabel')}</legend>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  {BRAND_CHOICES.map(({ brand, name }) => (
                    <label key={brand} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={slide.brands.includes(brand)} onChange={(e) => toggleBrand(slide, brand, e.target.checked)} />
                      {name}
                    </label>
                  ))}
                  {slide.kind !== 'text' && slide.brands.length > 0 && (
                    <select
                      aria-label={t('slideLogoColorLabel')}
                      value={slide.logo}
                      onChange={(e) => update(slide.id, { logo: e.target.value as SlideLogo, logo_color: null })}
                      className="h-9 rounded-[10px] border border-primary/20 bg-white px-3 text-sm"
                    >
                      <option value="auto">{t('logoAuto')}</option>
                      <option value="white">{t('logoWhite')}</option>
                      <option value="black">{t('logoBlack')}</option>
                    </select>
                  )}
                </div>
                {slide.kind === 'text' && slide.brands.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{t('slideLogoLilacNote')}</p>}
              </fieldset>
            )}
          </div>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => add('photo')} disabled={slides.length >= MAX_SLIDES}>{t('addPhotoSlide')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => add('text')} disabled={slides.length >= MAX_SLIDES}>{t('addTextSlide')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => add('image')} disabled={slides.length >= MAX_SLIDES}>{t('addImageSlide')}</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => manyInput.current?.click()} disabled={slides.length >= MAX_SLIDES || !!progress}>
          <ImagePlus size={16} aria-hidden className="mr-1.5" />
          {progress ? t('uploadingPhotos', { done: progress.done + 1, total: progress.total }) : t('uploadManyPhotos')}
        </Button>
        <input ref={manyInput} type="file" accept="image/*" multiple hidden onChange={(e) => addMany(e.target.files)} aria-label={t('uploadManyPhotos')} />
      </div>
      <p className="text-xs text-muted-foreground">{t('slidesLimit', { max: MAX_SLIDES })}</p>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
    </div>
  )
}
