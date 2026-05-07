'use client'

import { useState, useTransition } from 'react'
import { routing } from '@/i18n/routing'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditor'
import { createStaticPage, updateStaticPage, deleteStaticPage } from '@/lib/actions/static-page'
import { adminPrimaryButton } from '@/components/admin/admin-ui'

type AppLocale = (typeof routing.locales)[number]

type TranslationState = { title: string; body: EditorBlock[] | null }

function emptyTranslations(): Record<AppLocale, TranslationState> {
  const o = {} as Record<AppLocale, TranslationState>
  for (const loc of routing.locales) {
    o[loc] = { title: '', body: null }
  }
  return o
}

export type StaticPageFormInitial = {
  slug: string
  status: 'draft' | 'published'
  showInFooter: boolean
  footerSortOrder: number
  translations: Record<AppLocale, TranslationState>
}

function buildPayload(translations: Record<AppLocale, TranslationState>) {
  const payload: Record<string, { title: string; body: unknown }> = {}
  for (const loc of routing.locales) {
    const t = translations[loc]
    if (!t.title.trim()) continue
    payload[loc] = { title: t.title.trim(), body: t.body }
  }
  return JSON.stringify(payload)
}

export function StaticPageForm({
  pageId,
  initial,
}: {
  pageId?: string
  initial?: StaticPageFormInitial
}) {
  const [activeLocale, setActiveLocale] = useState<AppLocale>(routing.defaultLocale)
  const [translations, setTranslations] = useState<Record<AppLocale, TranslationState>>(
    () => initial?.translations ?? emptyTranslations(),
  )
  const [isPending, startTransition] = useTransition()

  const slugDefault = initial?.slug ?? ''
  const statusDefault = initial?.status ?? 'draft'
  const showFooterDefault = initial?.showInFooter ?? false
  const footerOrderDefault = initial?.footerSortOrder ?? 0

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    fd.set('translations_json', buildPayload(translations))
    startTransition(() => {
      if (pageId) void updateStaticPage(pageId, fd)
      else void createStaticPage(fd)
    })
  }

  const setTitle = (value: string) => {
    setTranslations((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], title: value },
    }))
  }

  const setBody = (blocks: EditorBlock[]) => {
    setTranslations((prev) => ({
      ...prev,
      [activeLocale]: { ...prev[activeLocale], body: blocks },
    }))
  }

  const fieldClass =
    'w-full rounded-[10px] border border-primary/20 bg-white px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/45'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">URL slug</label>
          <input
            name="slug"
            type="text"
            required
            defaultValue={slugDefault}
            placeholder="about"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase letters, numbers, and hyphens only"
            className={fieldClass}
          />
          <p className="text-xs text-muted-foreground">
            Public URL: /your-slug — cannot use reserved paths (articles, admin, …).
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Status</label>
            <select
              name="status"
              defaultValue={statusDefault}
              className={`${fieldClass} w-auto min-w-[8rem]`}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>
          <div className="flex items-end gap-2 pb-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="show_in_footer"
                defaultChecked={showFooterDefault}
                className="size-4 rounded border-primary/30 text-primary focus:ring-primary/30"
              />
              Show in footer
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-foreground">Footer order</label>
            <input
              name="footer_sort_order"
              type="number"
              defaultValue={footerOrderDefault}
              className={`${fieldClass} w-24`}
            />
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Locale</p>
          <div className="flex flex-wrap gap-2 rounded-2xl border border-primary/10 bg-muted/30 p-2">
            {routing.locales.map((loc) => (
              <button
                key={loc}
                type="button"
                onClick={() => setActiveLocale(loc)}
                className={`rounded-[10px] px-3 py-1.5 text-xs font-mono uppercase tracking-wide transition-colors ${
                  activeLocale === loc
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground'
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Title ({activeLocale})
          </label>
          <input
            type="text"
            value={translations[activeLocale].title}
            onChange={(ev) => setTitle(ev.target.value)}
            className={fieldClass}
            placeholder="Page title"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-semibold text-foreground">
            Body ({activeLocale})
          </label>
          <RichTextEditor
            key={`${pageId ?? 'new'}-${activeLocale}`}
            value={translations[activeLocale].body}
            onChange={setBody}
            locale={activeLocale}
          />
        </div>

        <div className="flex gap-3">
          <button type="submit" disabled={isPending} className={adminPrimaryButton}>
            {isPending ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {pageId && (
        <form action={deleteStaticPage} className="border-t border-primary/10 pt-6">
          <input type="hidden" name="page_id" value={pageId} />
          <button
            type="submit"
            className="text-sm font-medium text-destructive underline-offset-4 hover:underline disabled:opacity-50"
            disabled={isPending}
          >
            Delete this page
          </button>
        </form>
      )}
    </div>
  )
}
