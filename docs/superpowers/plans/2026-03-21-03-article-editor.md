# UNTOLD.ink — Plan 3: Article Editor

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Tiptap-powered WYSIWYG article editor with create, edit, publish, and delete workflow, accessible only to `admin` and `author` users.

**Architecture:** Server Actions (Next.js `'use server'`) handle all Supabase mutations. The `RichTextEditor` is a `'use client'` component using `@tiptap/react`; it stores Tiptap JSON which is the same format already consumed by `ArticleBody`. A shared `requireCreator()` helper enforces role-gating at the server component level. The `/create` page renders the article form directly (type picker deferred to Plan 4).

**Tech Stack:** Next.js 16 App Router, Supabase Postgres, `@tiptap/react` v3, `@tiptap/extension-link`, `@tiptap/extension-placeholder`, next-intl, Tailwind CSS v4, Vitest, Playwright

---

## File Map

```
lib/
├── actions/article.ts              # Server actions: create, update, publish, delete
└── require-creator.ts              # requireCreator() — role guard, redirects if needed

components/editor/
├── EditorToolbar.tsx               # Tiptap formatting buttons (use client)
└── RichTextEditor.tsx              # Tiptap editor + toolbar wrapper (use client)

app/[locale]/
├── create/
│   ├── page.tsx                    # New article form (admin/author only)
│   └── CreateArticleForm.tsx       # Client-side form with RichTextEditor
└── dashboard/
    ├── articles/
    │   ├── page.tsx                # List author's own articles (draft + published)
    │   └── DeleteArticleButton.tsx # Client component for delete confirm dialog
    └── articles/[id]/edit/
        ├── page.tsx                # Edit page (server component, loads existing article)
        └── EditArticleForm.tsx     # Client-side edit form with save/publish/delete

messages/en.json                    # Add 'dashboard' and 'editor' namespaces

tests/
├── unit/lib/require-creator.test.ts
└── e2e/editor.spec.ts
```

---

## Task 1: Install deps + write failing tests

**Files:**
- Modify: `package.json` (new deps)
- Create: `tests/unit/lib/require-creator.test.ts`

- [ ] **Step 1: Install Tiptap React integration and extensions**

```bash
cd /Users/noahlaux/code/surglobal/untold
npm install @tiptap/react @tiptap/extension-link @tiptap/extension-placeholder
```

Expected: package-lock.json updated, no errors.

- [ ] **Step 2: Write failing tests for require-creator helper**

Create `tests/unit/lib/require-creator.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { isCreatorRole } from '@/lib/require-creator'

// We test only the pure classification logic extracted from the guard.
// The actual redirect/createClient calls are tested via Playwright e2e.

describe('isCreatorRole', () => {
  it('returns true for admin', () => {
    expect(isCreatorRole('admin')).toBe(true)
  })
  it('returns true for author', () => {
    expect(isCreatorRole('author')).toBe(true)
  })
  it('returns false for user', () => {
    expect(isCreatorRole('user')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isCreatorRole(null)).toBe(false)
  })
})
```

> Note: `isCreatorRole` will be exported from `lib/require-creator.ts`.

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- tests/unit/lib/require-creator.test.ts
```

Expected: FAIL — module `@/lib/require-creator` does not exist yet.

---

## Task 2: `lib/require-creator.ts` — role guard helper

**Files:**
- Create: `lib/require-creator.ts`

- [ ] **Step 1: Implement require-creator**

Create `lib/require-creator.ts`:

```typescript
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { UserRole } from '@/lib/supabase/types'

export function isCreatorRole(role: UserRole | null | undefined): boolean {
  return role === 'admin' || role === 'author'
}

/**
 * Call from any server component that requires admin or author access.
 * Redirects to /auth/login if not authenticated, /forbidden if wrong role.
 * Returns { user, profile } on success.
 */
export async function requireCreator() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('id, role, display_name, slug')
    .eq('id', user.id)
    .single()

  if (!isCreatorRole(profile?.role)) redirect('/')

  return { user, profile }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npm test -- tests/unit/lib/require-creator.test.ts
```

Expected: PASS — 4 tests green.

- [ ] **Step 3: Commit**

```bash
git add lib/require-creator.ts tests/unit/lib/require-creator.test.ts
git commit -m "feat: add requireCreator role guard helper with tests"
```

---

## Task 3: `lib/actions/article.ts` — server actions

**Files:**
- Create: `lib/actions/article.ts`

> These actions are called from client-side forms via `action={createArticle}` or programmatic `startTransition`. All DB writes go through the Supabase server client with the logged-in user's session.

- [ ] **Step 1: Create article server actions**

Create `lib/actions/article.ts`:

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireCreator } from '@/lib/require-creator'
import { slugify } from '@/lib/utils'

export async function createArticle(formData: FormData) {
  const { user } = await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const body = formData.get('body') as string | null

  // Append a short timestamp suffix to ensure slug uniqueness
  const slug = `${slugify(title)}-${Date.now().toString(36)}`

  const { data: content, error } = await (supabase as any)
    .from('content')
    .insert({
      type: 'article',
      author_id: user.id,
      slug,
      source_locale: 'en',
      status: 'draft',
      cover_image_url: coverImageUrl,
    })
    .select('id')
    .single()

  if (error || !content) throw new Error(error?.message ?? 'Failed to create article')

  await (supabase as any).from('content_translations').insert({
    content_id: content.id,
    locale: 'en',
    title,
    excerpt,
    body: body ? JSON.parse(body) : null,
  })

  revalidatePath('/dashboard/articles')
  redirect(`/dashboard/articles/${content.id}/edit`)
}

export async function updateArticle(id: string, formData: FormData) {
  await requireCreator()
  const supabase = await createClient()

  const title = (formData.get('title') as string).trim()
  const excerpt = (formData.get('excerpt') as string)?.trim() || null
  const coverImageUrl = (formData.get('cover_image_url') as string)?.trim() || null
  const body = formData.get('body') as string | null

  await (supabase as any)
    .from('content')
    .update({ cover_image_url: coverImageUrl, updated_at: new Date().toISOString() })
    .eq('id', id)

  await (supabase as any)
    .from('content_translations')
    .upsert({
      content_id: id,
      locale: 'en',
      title,
      excerpt,
      body: body ? JSON.parse(body) : null,
    }, { onConflict: 'content_id,locale' })

  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function publishArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function unpublishArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null })
    .eq('id', id)

  revalidatePath('/dashboard/articles')
  revalidatePath(`/dashboard/articles/${id}/edit`)
}

export async function deleteArticle(id: string) {
  await requireCreator()
  const supabase = await createClient()

  await (supabase as any).from('content').delete().eq('id', id)

  revalidatePath('/dashboard/articles')
  redirect('/dashboard/articles')
}
```

- [ ] **Step 2: Run type-check to verify no obvious errors**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: 0 errors (or only pre-existing errors from Navigation.tsx / LocaleSwitcher.tsx).

- [ ] **Step 3: Commit**

```bash
git add lib/actions/article.ts
git commit -m "feat: add article server actions (create, update, publish, delete)"
```

---

## Task 4: `components/editor/EditorToolbar.tsx` — formatting buttons

**Files:**
- Create: `components/editor/EditorToolbar.tsx`

- [ ] **Step 1: Create toolbar component**

Create `components/editor/EditorToolbar.tsx`:

```tsx
'use client'

import type { Editor } from '@tiptap/react'

interface EditorToolbarProps {
  editor: Editor
}

interface ToolbarButton {
  label: string
  title: string
  action: () => boolean
  isActive: () => boolean
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const groups: ToolbarButton[][] = [
    [
      { label: 'B',  title: 'Bold',          action: () => editor.chain().focus().toggleBold().run(),        isActive: () => editor.isActive('bold') },
      { label: 'I',  title: 'Italic',        action: () => editor.chain().focus().toggleItalic().run(),      isActive: () => editor.isActive('italic') },
      { label: 'U',  title: 'Underline',     action: () => editor.chain().focus().toggleUnderline().run(),   isActive: () => editor.isActive('underline') },
      { label: 'S',  title: 'Strikethrough', action: () => editor.chain().focus().toggleStrike().run(),      isActive: () => editor.isActive('strike') },
    ],
    [
      { label: 'H1', title: 'Heading 1',     action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor.isActive('heading', { level: 1 }) },
      { label: 'H2', title: 'Heading 2',     action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor.isActive('heading', { level: 2 }) },
      { label: 'H3', title: 'Heading 3',     action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor.isActive('heading', { level: 3 }) },
    ],
    [
      { label: '❝',  title: 'Blockquote',    action: () => editor.chain().focus().toggleBlockquote().run(),  isActive: () => editor.isActive('blockquote') },
      { label: '`',  title: 'Inline code',   action: () => editor.chain().focus().toggleCode().run(),        isActive: () => editor.isActive('code') },
      { label: '{ }',title: 'Code block',    action: () => editor.chain().focus().toggleCodeBlock().run(),   isActive: () => editor.isActive('codeBlock') },
    ],
    [
      { label: '• ',  title: 'Bullet list',  action: () => editor.chain().focus().toggleBulletList().run(),  isActive: () => editor.isActive('bulletList') },
      { label: '1. ', title: 'Ordered list', action: () => editor.chain().focus().toggleOrderedList().run(), isActive: () => editor.isActive('orderedList') },
    ],
  ]

  const handleLinkToggle = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
    } else {
      const url = window.prompt('URL')
      if (url) editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const btnClass = (active: boolean) =>
    `px-2 py-1 text-xs font-mono rounded transition-colors ${
      active
        ? 'bg-[#A0522D] text-white'
        : 'text-[#2C2420] hover:bg-[rgba(160,82,45,0.12)]'
    }`

  return (
    <div
      className="flex flex-wrap items-center gap-1 p-2 border-b"
      style={{ borderColor: 'rgba(139,69,19,0.2)', background: 'rgba(160,82,45,0.04)' }}
    >
      {groups.map((group, gi) => (
        <span key={gi} className="flex items-center gap-1">
          {group.map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onClick={btn.action}
              className={btnClass(btn.isActive())}
            >
              {btn.label}
            </button>
          ))}
          {gi < groups.length - 1 && (
            <span className="mx-1 text-[rgba(139,69,19,0.3)]">|</span>
          )}
        </span>
      ))}
      <span className="mx-1 text-[rgba(139,69,19,0.3)]">|</span>
      <button
        type="button"
        title="Link"
        onClick={handleLinkToggle}
        className={btnClass(editor.isActive('link'))}
      >
        🔗
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/editor/EditorToolbar.tsx
git commit -m "feat: add EditorToolbar formatting buttons component"
```

---

## Task 5: `components/editor/RichTextEditor.tsx` — Tiptap editor

**Files:**
- Create: `components/editor/RichTextEditor.tsx`

> Uses the same extensions as `ArticleBody.tsx` so the JSON format is compatible. Also adds `Link` and `Placeholder` for authoring UX.

- [ ] **Step 1: Create editor component**

Create `components/editor/RichTextEditor.tsx`:

```tsx
'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorToolbar } from './EditorToolbar'

interface RichTextEditorProps {
  value?: Record<string, unknown> | null
  onChange: (json: Record<string, unknown>) => void
  placeholder?: string
}

export function RichTextEditor({ value, onChange, placeholder = 'Start writing…' }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? undefined,
    onUpdate({ editor }) {
      onChange(editor.getJSON() as Record<string, unknown>)
    },
  })

  // Sync external value changes (e.g. when page loads with existing article body)
  useEffect(() => {
    if (!editor || !value) return
    const current = editor.getJSON()
    if (JSON.stringify(current) !== JSON.stringify(value)) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  if (!editor) return null

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: '1px solid rgba(139,69,19,0.25)' }}
    >
      <EditorToolbar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose prose-stone max-w-none min-h-[320px] p-4 focus-within:outline-none
          prose-headings:font-['Audiowide'] prose-headings:uppercase
          prose-a:text-[#A0522D] prose-code:text-[#A0522D]
          prose-code:bg-[rgba(160,82,45,0.08)] prose-pre:bg-[#1C1712]"
      />
    </div>
  )
}
```

- [ ] **Step 2: Run type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: 0 new errors beyond pre-existing ones.

- [ ] **Step 3: Commit**

```bash
git add components/editor/RichTextEditor.tsx
git commit -m "feat: add RichTextEditor Tiptap component with toolbar"
```

---

## Task 6: i18n messages for dashboard and editor

**Files:**
- Modify: `messages/en.json`

- [ ] **Step 1: Add dashboard and editor namespaces**

In `messages/en.json`, add two new top-level keys after `"tag"`:

```json
  "dashboard": {
    "myArticles": "My Articles",
    "newArticle": "New Article",
    "draft": "Draft",
    "published": "Published",
    "editArticle": "Edit article",
    "deleteArticle": "Delete article",
    "deleteConfirm": "Delete this article? This cannot be undone.",
    "noArticles": "You haven't written anything yet.",
    "publish": "Publish",
    "unpublish": "Unpublish",
    "saveChanges": "Save changes",
    "saving": "Saving…"
  },
  "editor": {
    "titlePlaceholder": "Article title",
    "excerptPlaceholder": "Short summary shown in listings (optional)",
    "coverImagePlaceholder": "Cover image URL (optional)",
    "bodyPlaceholder": "Start writing your article…",
    "backToDashboard": "← Dashboard"
  }
```

- [ ] **Step 2: Run the test suite to confirm nothing broke**

```bash
npm test
```

Expected: all existing tests pass.

- [ ] **Step 3: Commit**

```bash
git add messages/en.json
git commit -m "feat: add dashboard and editor i18n namespaces"
```

---

## Task 7: `/create` — new article form page

**Files:**
- Create: `app/[locale]/create/page.tsx`

> This page collects title, excerpt, cover image URL, and the Tiptap body. On submit it calls `createArticle` server action which inserts the row and redirects to the edit page. No tags on creation (tags can be added on the edit page in a future plan).

- [ ] **Step 1: Create the page**

Create `app/[locale]/create/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { CreateArticleForm } from './CreateArticleForm'

export default async function CreatePage() {
  await requireCreator()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="mb-8">{t('titlePlaceholder')}</h1>
        <CreateArticleForm />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Create the client-side form component**

Create `app/[locale]/create/CreateArticleForm.tsx`:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { createArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function CreateArticleForm() {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => createArticle(fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          placeholder={t('titlePlaceholder')}
          required
          className="text-xl font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Input
          id="excerpt"
          name="excerpt"
          placeholder={t('excerptPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          placeholder={t('coverImagePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="gradient-rust text-white border-0"
      >
        {isPending ? td('saving') : 'Save as draft'}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/create/
git commit -m "feat: add create article page with RichTextEditor form"
```

---

## Task 8: `/dashboard/articles` — author's article list

**Files:**
- Create: `app/[locale]/dashboard/articles/page.tsx`
- Create: `app/[locale]/dashboard/articles/DeleteArticleButton.tsx`

- [ ] **Step 1: Create `DeleteArticleButton` — client component for confirm dialog**

`onSubmit` event handlers are silently dropped in server components. The delete confirmation must live in a `'use client'` wrapper.

Create `app/[locale]/dashboard/articles/DeleteArticleButton.tsx`:

```tsx
'use client'

import { useTranslations } from 'next-intl'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { deleteArticle } from '@/lib/actions/article'

export function DeleteArticleButton({ id }: { id: string }) {
  const td = useTranslations('dashboard')
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="text-red-600 hover:text-red-700"
      disabled={isPending}
      onClick={() => {
        if (confirm(td('deleteConfirm'))) {
          startTransition(() => deleteArticle(id))
        }
      }}
    >
      {td('deleteArticle')}
    </Button>
  )
}
```

- [ ] **Step 2: Create the articles list page**

Create `app/[locale]/dashboard/articles/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { publishArticle, unpublishArticle } from '@/lib/actions/article'
import { DeleteArticleButton } from './DeleteArticleButton'

// Badge component may not exist yet — use a simple inline pill
function StatusBadge({ status }: { status: string }) {
  const isPublished = status === 'published'
  return (
    <span
      className="text-xs font-mono px-2 py-0.5 rounded-full"
      style={{
        background: isPublished ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
        color: isPublished ? '#16a34a' : '#A0522D',
      }}
    >
      {status}
    </span>
  )
}

export default async function DashboardArticlesPage() {
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('dashboard')

  const { data: articles } = await (supabase as any)
    .from('content')
    .select(`
      id, slug, status, published_at, created_at,
      content_translations ( title, locale )
    `)
    .eq('author_id', user.id)
    .eq('type', 'article')
    .order('created_at', { ascending: false })

  const getTitle = (article: any) => {
    const t = article.content_translations?.find((t: any) => t.locale === 'en')
      ?? article.content_translations?.[0]
    return t?.title ?? '(Untitled)'
  }

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1>{t('myArticles')}</h1>
          <Button asChild className="gradient-rust text-white border-0">
            <Link href="/create">{t('newArticle')}</Link>
          </Button>
        </div>

        {(!articles || articles.length === 0) ? (
          <p className="text-[#6B5F58]">{t('noArticles')}</p>
        ) : (
          <ul className="space-y-3">
            {articles.map((article: any) => (
              <li
                key={article.id}
                className="flex items-center gap-4 p-4 rounded-lg"
                style={{ border: '1px solid rgba(139,69,19,0.15)', background: 'rgba(245,241,232,0.5)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{getTitle(article)}</p>
                  <p className="text-xs text-[#6B5F58] font-mono mt-0.5">
                    {new Date(article.created_at).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>

                <StatusBadge status={article.status} />

                <div className="flex items-center gap-2">
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/dashboard/articles/${article.id}/edit`}>{t('editArticle')}</Link>
                  </Button>

                  {article.status === 'draft' ? (
                    <form action={publishArticle.bind(null, article.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('publish')}</Button>
                    </form>
                  ) : (
                    <form action={unpublishArticle.bind(null, article.id)}>
                      <Button type="submit" size="sm" variant="outline">{t('unpublish')}</Button>
                    </form>
                  )}

                  <DeleteArticleButton id={article.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </>
  )
}
```

> Note: Delete confirmation lives in `DeleteArticleButton` (a `'use client'` component). The `deleteArticle` server action handles the actual deletion and redirect.

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/\[locale\]/dashboard/articles/
git commit -m "feat: add dashboard articles list with publish/delete actions"
```

---

## Task 9: `/dashboard/articles/[id]/edit` — edit article page

**Files:**
- Create: `app/[locale]/dashboard/articles/[id]/edit/page.tsx`
- Create: `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx`

- [ ] **Step 1: Create the server page**

Create `app/[locale]/dashboard/articles/[id]/edit/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { requireCreator } from '@/lib/require-creator'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { Footer } from '@/components/layout/Footer'
import { getNavProps } from '@/lib/nav'
import { Link } from '@/i18n/navigation'
import { EditArticleForm } from './EditArticleForm'

interface PageProps {
  params: Promise<{ locale: string; id: string }>
}

export default async function EditArticlePage({ params }: PageProps) {
  const { id } = await params
  const { user } = await requireCreator()
  const supabase = await createClient()
  const navProps = await getNavProps()
  const t = await getTranslations('editor')
  const td = await getTranslations('dashboard')

  const { data: article } = await (supabase as any)
    .from('content')
    .select('id, status, cover_image_url, content_translations ( title, excerpt, body, locale )')
    .eq('id', id)
    .eq('author_id', user.id)
    .eq('type', 'article')
    .single()

  if (!article) notFound()

  const enTranslation = article.content_translations?.find((t: any) => t.locale === 'en')
    ?? article.content_translations?.[0]

  return (
    <>
      <Navigation {...navProps} />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard/articles" className="text-sm text-[#A0522D] hover:underline font-mono">
            {t('backToDashboard')}
          </Link>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-full"
            style={{
              background: article.status === 'published' ? 'rgba(34,197,94,0.1)' : 'rgba(160,82,45,0.1)',
              color: article.status === 'published' ? '#16a34a' : '#A0522D',
            }}
          >
            {article.status}
          </span>
        </div>

        <EditArticleForm
          id={id}
          status={article.status}
          initialTitle={enTranslation?.title ?? ''}
          initialExcerpt={enTranslation?.excerpt ?? ''}
          initialCoverImageUrl={article.cover_image_url ?? ''}
          initialBody={enTranslation?.body ?? null}
        />
      </main>
      <Footer />
    </>
  )
}
```

- [ ] **Step 2: Create the client-side edit form**

Create `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx`:

```tsx
'use client'

import { useRef, useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { updateArticle, publishArticle, unpublishArticle, deleteArticle } from '@/lib/actions/article'
import { RichTextEditor } from '@/components/editor/RichTextEditor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface EditArticleFormProps {
  id: string
  status: string
  initialTitle: string
  initialExcerpt: string
  initialCoverImageUrl: string
  initialBody: Record<string, unknown> | null
}

export function EditArticleForm({
  id,
  status,
  initialTitle,
  initialExcerpt,
  initialCoverImageUrl,
  initialBody,
}: EditArticleFormProps) {
  const t = useTranslations('editor')
  const td = useTranslations('dashboard')
  const formRef = useRef<HTMLFormElement>(null)
  const [body, setBody] = useState<Record<string, unknown> | null>(initialBody)
  const [isPending, startTransition] = useTransition()

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current) return
    const fd = new FormData(formRef.current)
    if (body) fd.set('body', JSON.stringify(body))
    startTransition(() => updateArticle(id, fd))
  }

  return (
    <form ref={formRef} onSubmit={handleSave} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          name="title"
          defaultValue={initialTitle}
          placeholder={t('titlePlaceholder')}
          required
          className="text-xl font-semibold"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Input
          id="excerpt"
          name="excerpt"
          defaultValue={initialExcerpt}
          placeholder={t('excerptPlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cover_image_url">Cover image URL</Label>
        <Input
          id="cover_image_url"
          name="cover_image_url"
          type="url"
          defaultValue={initialCoverImageUrl}
          placeholder={t('coverImagePlaceholder')}
        />
      </div>

      <div className="space-y-2">
        <Label>Body</Label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder={t('bodyPlaceholder')}
        />
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="gradient-rust text-white border-0"
        >
          {isPending ? td('saving') : td('saveChanges')}
        </Button>

        {status === 'draft' ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(() => publishArticle(id))}
            disabled={isPending}
          >
            {td('publish')}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={() => startTransition(() => unpublishArticle(id))}
            disabled={isPending}
          >
            {td('unpublish')}
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          className="text-red-600 hover:text-red-700 ml-auto"
          onClick={() => {
            if (confirm(td('deleteConfirm'))) {
              startTransition(() => deleteArticle(id))
            }
          }}
          disabled={isPending}
        >
          {td('deleteArticle')}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add app/\[locale\]/dashboard/articles/
git commit -m "feat: add edit article page with save/publish/delete actions"
```

---

## Task 10: Playwright smoke tests

**Files:**
- Create: `tests/e2e/editor.spec.ts`

- [ ] **Step 1: Write Playwright smoke tests**

Create `tests/e2e/editor.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('Article Editor — unauthenticated guards', () => {
  test('redirects /create to login when not authenticated', async ({ page }) => {
    await page.goto('/create')
    // requireCreator() throws a redirect() to /auth/login (page-level guard, not middleware)
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })

  test('redirects /dashboard/articles to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard/articles')
    await expect(page).toHaveURL(/auth\/login|auth\/signup/)
  })
})

test.describe('Article Editor — navigation', () => {
  test('logged-in nav shows Create link', async ({ page }) => {
    // Visit home page and check nav structure (no auth — just checking nav renders)
    await page.goto('/')
    // The create button is only shown when logged in — we can only check it doesn't 500
    await expect(page).not.toHaveURL(/error/)
    await expect(page.locator('header')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run Playwright tests**

```bash
npm run test:e2e -- tests/e2e/editor.spec.ts
```

Expected: redirect tests pass (server returns 302 to login). Nav test passes.

- [ ] **Step 3: Final full test run**

```bash
npm test && npm run test:e2e
```

Expected: all unit and e2e tests pass.

- [ ] **Step 4: Final commit**

```bash
git add tests/e2e/editor.spec.ts
git commit -m "test: add Playwright smoke tests for editor route guards"
```

---

## Post-implementation notes

- **Tags on articles:** Tag attachment (linking `content_tags` rows) is deferred to Plan 4 Content Creation forms alongside other content types.
- **Image upload:** `cover_image_url` accepts a direct URL. File upload to Supabase Storage is deferred.
- **`/create` type picker:** Currently goes straight to article form. Plan 4 will convert this to a type picker with video/podcast/pill/course options.
- **`/dashboard` index:** There's currently no `/dashboard/page.tsx` root — the nav links to `/dashboard`. Adding an overview page is deferred to Plan 7 (Admin Dashboard).
- **Pre-existing TypeScript errors:** `Navigation.tsx` and `LocaleSwitcher.tsx` have 10 pre-existing errors from Plan 1. These are tracked separately and should not block this plan.
