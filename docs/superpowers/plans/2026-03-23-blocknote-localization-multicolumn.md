# BlockNote Localization & Multi-Column Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add locale-aware editor UI and multi-column layout support (editor + reader) to all five content editors.

**Architecture:** Install `@blocknote/xl-multi-column`, update `RichTextEditor` to use the extended schema + locale dictionary + column slash-menu items, add `columnList`/`column` rendering to `blocknote-to-html.ts`, add responsive CSS to `globals.css`, and thread a `locale` prop through all five editor forms.

**Tech Stack:** BlockNote v0.47.x, `@blocknote/xl-multi-column`, `@blocknote/core/locales`, next-intl `useLocale`, TypeScript, Vitest

**Spec:** `docs/superpowers/specs/2026-03-23-blocknote-localization-multicolumn-design.md`

---

## File Map

| File | What changes |
|---|---|
| `package.json` | Add `@blocknote/xl-multi-column` |
| `tests/unit/lib/blocknote-to-html.test.ts` | New — unit tests for column rendering |
| `lib/blocknote-to-html.ts` | Add `columnList` + `column` block cases |
| `app/globals.css` | Add responsive column CSS |
| `components/editor/RichTextEditor.tsx` | Full rewrite — schema, locale, slash menu, type export |
| `app/[locale]/create/article/CreateArticleForm.tsx` | `useLocale`, `EditorBlock` type, `locale` prop |
| `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx` | `useLocale`, `EditorBlock` type, `locale` prop |
| `app/[locale]/create/pill/CreatePillForm.tsx` | `useLocale`, `EditorBlock` type, `locale` prop |
| `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` | `useLocale`, `EditorBlock` type, `locale` prop |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | `useLocale`, `EditorBlock` type, `locale` prop |

---

## Task 1: Install `@blocknote/xl-multi-column`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

```bash
cd /path/to/project
npm install @blocknote/xl-multi-column@^0.47.2
```

Expected: package added to `node_modules/@blocknote/xl-multi-column`, version `0.47.x` in `package.json`.

- [ ] **Step 2: Verify TypeScript can see the types**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (clean) or only pre-existing errors unrelated to the new package.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install @blocknote/xl-multi-column"
```

---

## Task 2: Unit-test `columnList` and `column` rendering

**Files:**
- Create: `tests/unit/lib/blocknote-to-html.test.ts`

> There is already a pattern to follow: `tests/unit/lib/tiptap-translate.test.ts` uses `vitest` with `import { describe, it, expect } from 'vitest'`.

- [ ] **Step 1: Create the test file**

```typescript
// tests/unit/lib/blocknote-to-html.test.ts
import { describe, it, expect } from 'vitest'
import { blockNoteToHtml } from '@/lib/blocknote-to-html'

describe('blockNoteToHtml — columnList', () => {
  it('renders two columns side-by-side with equal 1fr widths when no width props set', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Left' }] }],
          },
          {
            type: 'column',
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Right' }] }],
          },
        ],
      },
    ])
    expect(html).toContain('class="bn-column-list"')
    expect(html).toContain('grid-template-columns:1fr 1fr')
    expect(html).toContain('class="bn-column"')
    expect(html).toContain('<p>Left</p>')
    expect(html).toContain('<p>Right</p>')
  })

  it('respects column width props to produce asymmetric fr values', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            props: { width: 1.4 },
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Wide' }] }],
          },
          {
            type: 'column',
            props: { width: 0.8 },
            children: [{ type: 'paragraph', content: [{ type: 'text', text: 'Narrow' }] }],
          },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1.4fr 0.8fr')
  })

  it('falls back to 1fr for individual columns missing a width prop', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          {
            type: 'column',
            children: [{ type: 'paragraph' }],
          },
          {
            type: 'column',
            props: { width: 1.5 },
            children: [{ type: 'paragraph' }],
          },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1fr 1.5fr')
  })

  it('renders three columns', () => {
    const html = blockNoteToHtml([
      {
        type: 'columnList',
        children: [
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'A' }] }] },
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'B' }] }] },
          { type: 'column', children: [{ type: 'paragraph', content: [{ type: 'text', text: 'C' }] }] },
        ],
      },
    ])
    expect(html).toContain('grid-template-columns:1fr 1fr 1fr')
    expect(html).toContain('<p>A</p>')
    expect(html).toContain('<p>B</p>')
    expect(html).toContain('<p>C</p>')
  })

  it('falls back to display:flex when columnList has no children', () => {
    const html = blockNoteToHtml([
      { type: 'columnList', children: [] },
    ])
    expect(html).toContain('display:flex')
    expect(html).not.toContain('grid-template-columns')
  })
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npx vitest run tests/unit/lib/blocknote-to-html.test.ts
```

Expected: 4 failing tests — `columnList` and `column` cases don't exist yet.

---

## Task 3: Implement `columnList` and `column` in `blocknote-to-html.ts`

**Files:**
- Modify: `lib/blocknote-to-html.ts`

- [ ] **Step 1: Add the two new cases to `blockToHtml`**

In `lib/blocknote-to-html.ts`, find the `switch (block.type)` statement inside `blockToHtml`. Add these two cases **before** the `default:` case:

```typescript
    case 'column':
      return `<div class="bn-column">${children}</div>`

    case 'columnList': {
      const cols = block.children ?? []
      const style = cols.length > 0
        ? `display:grid;grid-template-columns:${cols.map((col) => `${(col.props?.width as number | undefined) ?? 1}fr`).join(' ')};gap:1.5rem`
        : 'display:flex;gap:1.5rem'
      return `<div class="bn-column-list" style="${style}">${children}</div>`
    }
```

Note: In `blockToHtml`, `children` is already the pre-rendered HTML string from `blocksToHtml(block.children)`. The `cols` variable independently reads `block.children` (the raw array) solely to extract `width` props.

- [ ] **Step 2: Run the tests**

```bash
npx vitest run tests/unit/lib/blocknote-to-html.test.ts
```

Expected: 5 passing tests.

- [ ] **Step 3: Run the full unit test suite to confirm no regressions**

```bash
npx vitest run tests/unit
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add lib/blocknote-to-html.ts tests/unit/lib/blocknote-to-html.test.ts
git commit -m "feat: render columnList and column blocks in blocknote-to-html"
```

---

## Task 4: Add responsive column CSS to `globals.css`

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Append the column styles**

At the end of `app/globals.css`, add:

```css
/* Multi-column article layout */
@media (max-width: 768px) {
  .bn-column-list {
    grid-template-columns: 1fr !important;
  }
}

.bn-column > * + * {
  margin-top: 1rem;
}
```

- [ ] **Step 2: Verify TypeScript is still clean**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add responsive column CSS for article reader"
```

---

## Task 5: Rewrite `RichTextEditor` with multi-column schema and locale support

**Files:**
- Modify: `components/editor/RichTextEditor.tsx`

This is the central change. The component gains a `locale` prop, uses the extended schema, exports `EditorBlock`, and adds the column slash-menu items.

- [ ] **Step 1: Replace the full content of `RichTextEditor.tsx`**

```typescript
'use client'
import '@blocknote/mantine/style.css'
import { Block, BlockNoteSchema, filterSuggestionItems, combineByGroup } from '@blocknote/core'
import { en, de, fr, es, pt } from '@blocknote/core/locales'
import {
  useCreateBlockNote,
  BlockNoteView,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
} from '@blocknote/react'
import {
  withMultiColumn,
  multiColumnDropCursor,
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
} from '@blocknote/xl-multi-column'
import { useEffect, useRef } from 'react'

// Schema created once at module level — never inside the component
const multiColumnSchema = withMultiColumn(BlockNoteSchema.create())

const BASE_LOCALES = { en, de, fr, es, pt }
const LOCALE_MAP: Record<string, keyof typeof BASE_LOCALES> = {
  es: 'es', pt: 'pt', fr: 'fr', de: 'de', da: 'en', en: 'en',
}

export type EditorBlock = Block<
  typeof multiColumnSchema.blockSchema,
  typeof multiColumnSchema.inlineContentSchema,
  typeof multiColumnSchema.styleSchema
>

interface RichTextEditorProps {
  value?: EditorBlock[] | null
  onChange: (blocks: EditorBlock[]) => void
  placeholder?: string
  locale?: string
}

async function uploadImageToSupabase(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  form.append('type', 'content')
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error('Image upload failed')
  const { url } = await res.json()
  return url
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing\u2026',
  locale = 'en',
}: RichTextEditorProps) {
  const initialContentRef = useRef(value ?? undefined)

  const key = LOCALE_MAP[locale] ?? 'en'
  const dictionary = {
    ...BASE_LOCALES[key],
    ...(multiColumnLocales[key] ?? multiColumnLocales.en),
  }

  const editor = useCreateBlockNote({
    schema: multiColumnSchema,
    initialContent: initialContentRef.current ?? undefined,
    uploadFile: uploadImageToSupabase,
    placeholders: { default: placeholder },
    dropCursor: multiColumnDropCursor,
    dictionary,
  })

  // Sync external value changes (e.g. locale switch loads different content)
  useEffect(() => {
    if (!editor || !value) return
    const current = JSON.stringify(editor.document)
    if (current !== JSON.stringify(value)) {
      editor.replaceBlocks(editor.document, value)
    }
  }, [editor, value])

  return (
    <div
      className="rounded-lg overflow-hidden bg-white"
      style={{ border: '1px solid rgba(139,69,19,0.25)', minHeight: 320 }}
    >
      <BlockNoteView
        editor={editor}
        theme="light"
        style={{ fontFamily: 'Inter, sans-serif', background: '#ffffff' }}
        slashMenu={false}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              combineByGroup(
                getDefaultReactSlashMenuItems(editor),
                getMultiColumnSlashMenuItems(editor),
              ),
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  )
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: errors about `Block[]` in the five editor forms — those are fixed in Tasks 6–8. If there are errors in `RichTextEditor.tsx` itself (wrong import paths, missing exports from `@blocknote/xl-multi-column`), fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add components/editor/RichTextEditor.tsx
git commit -m "feat: add multi-column schema, locale dictionary, and column slash-menu to RichTextEditor"
```

---

## Task 6: Update article editor forms

**Files:**
- Modify: `app/[locale]/create/article/CreateArticleForm.tsx`
- Modify: `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx`

Both forms use `import('@blocknote/core').Block[]` for their body state. Replace with `EditorBlock` from `RichTextEditor`, add `useLocale()`, and pass `locale` to the editor.

- [ ] **Step 1: Update `CreateArticleForm.tsx`**

Add to imports:
```typescript
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
```

Remove any `import('@blocknote/core').Block[]` inline type references.

Inside `CreateArticleForm`:
```typescript
const locale = useLocale()
```

Change state:
```typescript
const [body, setBody] = useState<EditorBlock[] | null>(null)
```

Update the `<RichTextEditor>` call:
```tsx
<RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
```

- [ ] **Step 2: Update `EditArticleForm.tsx`**

Add to imports:
```typescript
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
```

Remove any `import('@blocknote/core').Block[]` inline type references.

Change the `initialBody` prop type in the interface:
```typescript
initialBody: EditorBlock[] | null
```

Inside `EditArticleForm`:
```typescript
const locale = useLocale()
```

Change state:
```typescript
const [body, setBody] = useState<EditorBlock[] | null>(initialBody)
```

Update the `<RichTextEditor>` call (it's around line 210):
```tsx
<RichTextEditor
  value={body}
  onChange={handleBodyChange}
  placeholder={t('bodyPlaceholder')}
  locale={locale}
/>
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "article" | head -20
```

Expected: no errors related to article forms.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/create/article/CreateArticleForm.tsx app/\[locale\]/dashboard/articles/\[id\]/edit/EditArticleForm.tsx
git commit -m "feat: pass locale to RichTextEditor in article forms"
```

---

## Task 7: Update pill editor forms

**Files:**
- Modify: `app/[locale]/create/pill/CreatePillForm.tsx`
- Modify: `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx`

Same pattern as Task 6.

- [ ] **Step 1: Update `CreatePillForm.tsx`**

Add to imports:
```typescript
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
```

Inside `CreatePillForm`:
```typescript
const locale = useLocale()
```

Change state:
```typescript
const [body, setBody] = useState<EditorBlock[] | null>(null)
```

Update the `<RichTextEditor>` call (around line 52):
```tsx
<RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
```

- [ ] **Step 2: Update `EditPillForm.tsx`**

Add to imports:
```typescript
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
```

Change the `initialBody` prop type in the interface:
```typescript
initialBody: EditorBlock[] | null
```

Inside `EditPillForm`:
```typescript
const locale = useLocale()
```

Change state:
```typescript
const [body, setBody] = useState<EditorBlock[] | null>(initialBody)
```

Update the `<RichTextEditor>` call (around line 64):
```tsx
<RichTextEditor value={body} onChange={setBody} placeholder={t('bodyPlaceholder')} locale={locale} />
```

- [ ] **Step 3: Check TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "pill" | head -20
```

Expected: no errors related to pill forms.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/create/pill/CreatePillForm.tsx app/\[locale\]/dashboard/pills/\[id\]/edit/EditPillForm.tsx
git commit -m "feat: pass locale to RichTextEditor in pill forms"
```

---

## Task 8: Update video editor form

**Files:**
- Modify: `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx`

This form imports `Block` from `@blocknote/core` at the top (line 5) and uses it for `initialBody` and body state.

- [ ] **Step 1: Update `EditVideoForm.tsx`**

Replace:
```typescript
import type { Block } from '@blocknote/core'
```
With:
```typescript
import { useLocale } from 'next-intl'
import type { EditorBlock } from '@/components/editor/RichTextEditor'
```

In the `EditVideoFormProps` interface, change:
```typescript
initialBody: Block[] | null
```
to:
```typescript
initialBody: EditorBlock[] | null
```

Inside `EditVideoForm`:
```typescript
const locale = useLocale()
```

Change the body state type wherever `Block[]` appears:
```typescript
// find: Block[] | null  →  replace with: EditorBlock[] | null
```

Update the `<RichTextEditor>` call (around line 333):
```tsx
<RichTextEditor value={body} onChange={handleBodyChange} locale={locale} />
```

- [ ] **Step 2: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1
```

Expected: no output (fully clean). If there are remaining `Block[]` type mismatches in the video form or elsewhere, fix them now.

- [ ] **Step 3: Run full unit test suite**

```bash
npx vitest run tests/unit
```

Expected: all passing.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/dashboard/videos/\[id\]/edit/EditVideoForm.tsx
git commit -m "feat: pass locale to RichTextEditor in video form"
```

---

## Task 9: Playwright verification

**Files:**
- Create: `tests/e2e/blocknote-multicolumn.spec.ts` (or add to existing blocknote spec if one exists)

- [ ] **Step 1: Check for an existing blocknote e2e spec**

```bash
ls tests/e2e/ | grep -i block
```

If one exists, add the new tests to it. Otherwise create a new file.

- [ ] **Step 2: Write Playwright tests**

```typescript
import { test, expect } from '@playwright/test'

test.describe('BlockNote multi-column + locale', () => {
  test('slash menu shows column options in German editor', async ({ page }) => {
    // Log in as author (use test credentials from project memory)
    await page.goto('/de/dashboard/articles')
    // Open any article for editing
    await page.getByRole('link', { name: /edit/i }).first().click()
    // Click into the editor and trigger the slash menu
    await page.locator('.bn-editor').click()
    await page.keyboard.type('/')
    // Expect German column option to appear
    await expect(page.getByText(/Spalten/i)).toBeVisible()
  })

  test('column blocks render side-by-side in article reader', async ({ page }) => {
    // This test relies on an article with column content already saved.
    // Navigate to a published article that contains a columnList block.
    // If no such article exists, create one via the editor first.
    await page.goto('/en/articles') // adjust to actual article reader URL
    const articleWithColumns = page.locator('.bn-column-list').first()
    // On desktop viewport, columns should be side-by-side (grid)
    await expect(articleWithColumns).toHaveCSS('display', 'grid')
  })

  test('column blocks stack on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/en/articles') // adjust to article with columns
    // Wait for the column list element
    const columnList = page.locator('.bn-column-list').first()
    // On mobile, grid-template-columns should collapse to 1fr via media query
    // Verify by checking computed style or that columns stack vertically
    await expect(columnList).toBeVisible()
    // The CSS media query forces grid-template-columns: 1fr, making columns stack
    const gridCols = await columnList.evaluate((el) =>
      window.getComputedStyle(el).getPropertyValue('grid-template-columns')
    )
    expect(gridCols).toMatch(/^\d+(\.\d+)?px$/) // single column width on mobile
  })
})
```

- [ ] **Step 3: Run the Playwright tests**

```bash
npx playwright test tests/e2e/blocknote-multicolumn.spec.ts
```

Fix any failures before marking done.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/blocknote-multicolumn.spec.ts
git commit -m "test: add Playwright tests for BlockNote multi-column and locale"
```

---

## Final Check

After all tasks:

1. Start the dev server: `npm run dev`
2. Navigate to `/de/dashboard/articles/[any-id]/edit` — the editor slash menu should show "2 Spalten" (German for "2 columns") in the `/` menu.
3. Insert a 2-column layout, type in each column, save. Confirm it saves without error.
4. View the published article — columns should render side-by-side on desktop, stacked on mobile.
5. Navigate to `/es/create/article` — slash menu should show Spanish column labels.
