'use client'

import { useTranslations } from 'next-intl'
import { TEXT_BG_COLOR, TEXT_BGS, TEXT_COLORS, TEXT_SIZES, TEXT_XS, TEXT_YS, type PillSlide, type TextBg, type TextColor, type TextSize } from '@/lib/pill-slides'

const labelClass = 'mb-1 block text-xs font-semibold text-foreground'
const choice = (selected: boolean) => `rounded-[8px] border text-xs transition-colors ${selected ? 'border-black bg-black text-white' : 'border-primary/20 bg-white text-foreground hover:bg-primary/5'}`

/** Where the text of a photo slide goes (nine places), how big it is (four sizes) and its colour (white or black) */
export function TextPlacement({ slide, onChange }: { slide: PillSlide; onChange: (changes: Partial<PillSlide>) => void }) {
  const t = useTranslations('editor')
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div>
        <span className={labelClass} id={`pos-${slide.id}`}>{t('textPositionLabel')}</span>
        <div role="radiogroup" aria-labelledby={`pos-${slide.id}`} className="grid grid-cols-3 gap-1">
          {TEXT_YS.flatMap((y) =>
            TEXT_XS.map((x) => {
              const selected = slide.text_x === x && slide.text_y === y
              const name = t(`textPos.${y}${x[0].toUpperCase()}${x.slice(1)}`)
              return (
                <button
                  key={`${y}-${x}`}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={name}
                  title={name}
                  onClick={() => onChange({ text_x: x, text_y: y })}
                  className={`flex h-8 w-8 items-center justify-center ${choice(selected)}`}
                >
                  <span aria-hidden className="block h-2 w-2 rounded-full" style={{ background: selected ? '#fff' : 'rgba(0,0,0,0.35)' }} />
                </button>
              )
            }),
          )}
        </div>
      </div>

      <div>
        <span className={labelClass} id={`size-${slide.id}`}>{t('textSizeLabel')}</span>
        <div role="radiogroup" aria-labelledby={`size-${slide.id}`} className="flex gap-1">
          {TEXT_SIZES.map((size: TextSize) => {
            const selected = slide.text_size === size
            return (
              <button key={size} type="button" role="radio" aria-checked={selected} aria-label={t(`textSize.${size}`)} title={t(`textSize.${size}`)} onClick={() => onChange({ text_size: size })} className={`h-8 w-9 ${choice(selected)}`}>
                {size.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className={labelClass} id={`color-${slide.id}`}>{t('textColorLabel')}</span>
        <div role="radiogroup" aria-labelledby={`color-${slide.id}`} className="flex gap-1">
          {TEXT_COLORS.map((color: TextColor) => {
            const selected = slide.text_color === color
            return (
              <button key={color} type="button" role="radio" aria-checked={selected} aria-label={t(`textColor.${color}`)} title={t(`textColor.${color}`)} onClick={() => onChange({ text_color: color })} className={`flex h-8 w-8 items-center justify-center ${choice(selected)}`}>
                <span aria-hidden className="block h-4 w-4 rounded-full" style={{ background: color === 'white' ? '#fff' : '#111', border: '1px solid rgba(0,0,0,0.3)' }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** The size of the text of a text slide (four sizes), where it is aligned (left or centred) and its background (lilac or white) */
export function TextSlideStyle({ slide, onChange }: { slide: PillSlide; onChange: (changes: Partial<PillSlide>) => void }) {
  const t = useTranslations('editor')
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div>
        <span className={labelClass} id={`tsize-${slide.id}`}>{t('textSizeLabel')}</span>
        <div role="radiogroup" aria-labelledby={`tsize-${slide.id}`} className="flex gap-1">
          {TEXT_SIZES.map((size: TextSize) => {
            const selected = slide.text_size === size
            return (
              <button key={size} type="button" role="radio" aria-checked={selected} aria-label={t(`textSize.${size}`)} title={t(`textSize.${size}`)} onClick={() => onChange({ text_size: size })} className={`h-8 w-9 ${choice(selected)}`}>
                {size.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className={labelClass} id={`talign-${slide.id}`}>{t('textAlignLabel')}</span>
        <div role="radiogroup" aria-labelledby={`talign-${slide.id}`} className="flex gap-1">
          {(['left', 'center'] as const).map((x) => {
            const selected = slide.text_x === x
            return (
              <button key={x} type="button" role="radio" aria-checked={selected} onClick={() => onChange({ text_x: x })} className={`h-8 px-3 ${choice(selected)}`}>
                {t(`textAlign.${x}`)}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className={labelClass} id={`tbg-${slide.id}`}>{t('textBgLabel')}</span>
        <div role="radiogroup" aria-labelledby={`tbg-${slide.id}`} className="flex gap-1">
          {TEXT_BGS.map((bg: TextBg) => {
            const selected = slide.text_bg === bg
            return (
              <button key={bg} type="button" role="radio" aria-checked={selected} aria-label={t(`textBg.${bg}`)} title={t(`textBg.${bg}`)} onClick={() => onChange({ text_bg: bg })} className={`flex h-8 w-8 items-center justify-center ${choice(selected)}`}>
                <span aria-hidden className="block h-4 w-4 rounded-full" style={{ background: TEXT_BG_COLOR[bg], border: '1px solid rgba(0,0,0,0.3)' }} />
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
