'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditorLazy'
import { Button } from '@/components/ui/button'
import { FIELD_CLASS } from '@/components/ui/field-styles'
import { markTranslationReviewed, saveTranslation, translateAgain } from '@/lib/actions/translations'
import { blocksPlainText, type TranslationEditorData, type TranslationLocale, type TranslationStatus } from '@/lib/translation-editor'

const LANGUAGE_NAMES: Record<string, string> = { en: 'English', es: 'Español', pt: 'Português', fr: 'Français', de: 'Deutsch', da: 'Dansk' }
const STATUS_STYLE: Record<TranslationStatus, { background: string; color: string }> = {
  auto: { background: '#eef2ff', color: '#3730a3' },
  manual: { background: '#dcfce7', color: '#14532d' },
  review: { background: '#fef3c7', color: '#78350f' },
  pending: { background: '#f3f4f6', color: '#374151' },
}
const textareaClass = 'w-full rounded-[10px] border border-primary/20 bg-white px-4 py-3 text-base text-foreground outline-none transition-colors focus:border-primary/50'
const hint = 'text-xs text-muted-foreground'

type Draft = Pick<TranslationLocale, 'title' | 'summary' | 'body' | 'slides'>

/**
 * "Traducciones": the translation of the content into each active language, to correct by hand. What is saved is protected
 * (the automatic translator never touches it again) until it is translated automatically again.
 */
export function TranslationsPanel({ data }: { data: TranslationEditorData }) {
  const t = useTranslations('translationEditor')
  const router = useRouter()
  const [, startTransition] = useTransition()
  const first = data.locales.find((l) => l.status === 'review') ?? data.locales.find((l) => l.status === 'pending') ?? data.locales[0]
  const [active, setActive] = useState(first?.locale)
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(data.locales.map((l) => [l.locale, { title: l.title, summary: l.summary, body: l.body, slides: l.slides }])))
  const [statuses, setStatuses] = useState<Record<string, TranslationStatus>>(() => Object.fromEntries(data.locales.map((l) => [l.locale, l.status])))
  const [busy, setBusy] = useState<'save' | 'again' | 'review' | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  if (data.locales.length === 0) return null
  const locale = data.locales.find((l) => l.locale === active) ?? data.locales[0]
  const draft = drafts[locale.locale]
  const status = statuses[locale.locale]
  const change = (changes: Partial<Draft>) => setDrafts((d) => ({ ...d, [locale.locale]: { ...d[locale.locale], ...changes } }))

  const run = async (kind: 'save' | 'again' | 'review', action: () => Promise<void>, done: string, after?: () => void) => {
    setBusy(kind)
    setMessage(null)
    try {
      await action()
      after?.()
      setMessage({ kind: 'ok', text: done })
      startTransition(() => router.refresh())
    } catch (err) {
      setMessage({ kind: 'error', text: err instanceof Error && err.message ? err.message : t('error') })
    } finally {
      setBusy(null)
    }
  }

  const save = () => {
    if (!draft.title.trim()) return setMessage({ kind: 'error', text: t('emptyTitle') })
    void run(
      'save',
      () => saveTranslation(data.contentId, locale.locale, {
        title: draft.title,
        ...(data.fields.summary ? { summary: draft.summary } : {}),
        ...(data.fields.body ? { body: draft.body } : {}),
        ...(data.fields.slides ? { slides: draft.slides } : {}),
      }),
      t('saved'),
      () => setStatuses((s) => ({ ...s, [locale.locale]: 'manual' })),
    )
  }
  const again = () => {
    if (status === 'manual' || status === 'review') {
      if (!window.confirm(t('translateAgainConfirm'))) return
    }
    void run('again', () => translateAgain(data.contentId, locale.locale), t('translated'), () => setStatuses((s) => ({ ...s, [locale.locale]: 'auto' })))
  }
  const reviewed = () =>
    void run('review', () => markTranslationReviewed(data.contentId, locale.locale), t('reviewed'), () => setStatuses((s) => ({ ...s, [locale.locale]: 'manual' })))

  const notice = status === 'review' ? t('reviewNotice') : status === 'pending' ? t('pendingNotice') : status === 'manual' ? t('manualNotice') : t('autoNotice')

  return (
    <section className="mt-12 space-y-4 border-t border-primary/15 pt-8" aria-labelledby="translations-title">
      <div>
        <h2 id="translations-title" className="text-xl">{t('title')}</h2>
        <p className="mt-1 text-sm text-[#6B5F58]">{t('intro')}</p>
        {data.shortOnly && <p className="mt-2 rounded-[10px] bg-primary/5 px-4 py-2 text-sm text-[#6B5F58]">{t('shortOnlyNote')}</p>}
      </div>

      <div role="tablist" aria-label={t('tabsLabel')} className="flex flex-wrap gap-2">
        {data.locales.map((l) => {
          const selected = l.locale === locale.locale
          return (
            <button
              key={l.locale}
              type="button"
              role="tab"
              id={`tr-tab-${l.locale}`}
              aria-selected={selected}
              aria-controls={`tr-panel-${l.locale}`}
              onClick={() => { setActive(l.locale); setMessage(null) }}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors"
              style={{ border: '1.5px solid #000', background: selected ? '#000' : '#fff', color: selected ? '#fff' : '#000' }}
            >
              {LANGUAGE_NAMES[l.locale] ?? l.locale}
              <span className="rounded-full px-2 py-0.5 text-[11px]" style={STATUS_STYLE[statuses[l.locale]]}>{t(`status.${statuses[l.locale]}`)}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`tr-panel-${locale.locale}`} aria-labelledby={`tr-tab-${locale.locale}`} className="space-y-5 rounded-2xl border border-primary/20 bg-white p-6">
        <p className="rounded-[10px] px-4 py-2 text-sm" style={STATUS_STYLE[status]}>{notice}</p>

        <div className="space-y-1.5">
          <label htmlFor={`tr-title-${locale.locale}`} className="block text-sm font-semibold text-foreground">{t('titleLabel')}</label>
          <input id={`tr-title-${locale.locale}`} className={FIELD_CLASS} value={draft.title} maxLength={300} onChange={(e) => change({ title: e.target.value })} lang={locale.locale} />
          {data.source.title && <p className={hint}>{t('original')}: {data.source.title}</p>}
        </div>

        {data.fields.summary && (
          <div className="space-y-1.5">
            <label htmlFor={`tr-summary-${locale.locale}`} className="block text-sm font-semibold text-foreground">{t('summaryLabel')}</label>
            <textarea id={`tr-summary-${locale.locale}`} className={textareaClass} rows={4} value={draft.summary} onChange={(e) => change({ summary: e.target.value })} lang={locale.locale} />
            {data.source.summary && <p className={hint}>{t('original')}: {data.source.summary}</p>}
          </div>
        )}

        {data.fields.slides && data.source.slides.length > 0 && (
          <fieldset className="space-y-3">
            <legend className="mb-1 block text-sm font-semibold text-foreground">{t('slidesLabel')}</legend>
            {data.source.slides.map((slide, i) => {
              const own = draft.slides.find((s) => s.id === slide.id)
              return (
                <div key={slide.id} className="space-y-1.5">
                  <label htmlFor={`tr-slide-${locale.locale}-${slide.id}`} className="block text-xs font-semibold text-foreground">{t('slideLabel', { n: i + 1 })}</label>
                  <textarea
                    id={`tr-slide-${locale.locale}-${slide.id}`}
                    className={textareaClass}
                    rows={3}
                    value={own?.text ?? ''}
                    lang={locale.locale}
                    onChange={(e) => change({ slides: draft.slides.map((s) => (s.id === slide.id ? { ...s, text: e.target.value } : s)) })}
                  />
                  <p className={hint}>{t('original')}: {slide.text}</p>
                </div>
              )
            })}
          </fieldset>
        )}

        {data.fields.body && (
          <div className="space-y-1.5">
            <span className="block text-sm font-semibold text-foreground">{t('bodyLabel')}</span>
            <div className="overflow-hidden rounded-[10px] border border-primary/20">
              <RichTextEditor key={locale.locale} value={draft.body as EditorBlock[] | null} onChange={(body) => change({ body: body as Draft['body'] })} locale={locale.locale} videos="none" />
            </div>
            {data.source.body && <p className={hint}>{t('original')}: {blocksPlainText(data.source.body).slice(0, 400)}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="button" className="gradient-rust border-0 text-white" onClick={save} disabled={busy !== null}>
            {busy === 'save' ? t('saving') : t('save')}
          </Button>
          {status === 'review' && (
            <Button type="button" variant="outline" onClick={reviewed} disabled={busy !== null}>{t('markReviewed')}</Button>
          )}
          <Button type="button" variant="outline" onClick={again} disabled={busy !== null}>
            {busy === 'again' ? t('translating') : status === 'pending' ? t('translateNow') : t('translateAgain')}
          </Button>
        </div>

        {message && (
          <p role={message.kind === 'error' ? 'alert' : 'status'} className={`text-sm ${message.kind === 'error' ? 'text-red-600' : 'text-green-700'}`}>{message.text}</p>
        )}
      </div>
    </section>
  )
}
