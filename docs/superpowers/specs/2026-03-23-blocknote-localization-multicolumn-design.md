# BlockNote Localization & Multi-Column Design

## Goal

Add two editor enhancements to the UNTOLD platform: (1) localize the BlockNote editor UI to match the user's chosen app language, and (2) enable multi-column layouts in all content editors, with correct width-aware rendering in the article reader.

## Scope

Both features apply to all editors: articles (create + edit), pills (create + edit), videos (edit). There is no course editor at this time.

---

## Feature 1: Editor Localization

### What

BlockNote's editor chrome (slash menu labels, toolbar tooltips, placeholder text, drag-handle menu) should render in the user's current locale rather than always in English.

### How

`RichTextEditor` gains a `locale` prop (`string`). It maps the app locale to a BlockNote dictionary and passes it to `useCreateBlockNote({ dictionary })`.

BlockNote ships built-in dictionaries importable from `@blocknote/core/locales` (a separate subpath entry point — not from `@blocknote/core` directly):

```ts
import { en, de, fr, es, pt } from '@blocknote/core/locales'
```

Danish (`da`) has no built-in dictionary — the editor UI falls back to `en` for that locale. This only affects editor chrome; article content translation (via DeepL) is unaffected.

**Locale mapping:**

| App locale | BlockNote dictionary |
|---|---|
| `es` | `es` |
| `pt` | `pt` |
| `fr` | `fr` |
| `de` | `de` |
| `da` | `en` (fallback) |
| `en` | `en` |

### Call sites

All five editor forms already have access to the locale via `useLocale()` from next-intl and pass it as a `locale` prop to `RichTextEditor`.

---

## Feature 2: Multi-Column Layouts

### What

Authors can insert 2- or 3-column layouts into any content body via the slash menu. Columns are resizable by dragging in the editor. In the article reader, columns render side-by-side on desktop with widths proportional to the `width` props stored by the editor, and collapse to a single vertical stack on mobile (below 768px).

### Package

Requires installing `@blocknote/xl-multi-column` — a first-party BlockNote package in the same version family (v0.47.x).

### TypeScript: Block type change

Switching from the implicit default schema to `withMultiColumn(BlockNoteSchema.create())` changes the type of `editor.document` from `Block[]` to `Block<typeof schema.blockSchema, typeof schema.inlineContentSchema, typeof schema.styleSchema>[]`, which includes `columnList` and `column` block types.

In `RichTextEditor.tsx`, the schema is created at module level (outside the component, to avoid recreation on each render). The `EditorBlock` type is derived from the schema's generic parameters and re-exported for use in the editor forms:

```ts
import { Block, BlockNoteSchema } from '@blocknote/core'
import { withMultiColumn } from '@blocknote/xl-multi-column'

const multiColumnSchema = withMultiColumn(BlockNoteSchema.create())

// Derive the correct Block type from the schema instance's properties
export type EditorBlock = Block<
  typeof multiColumnSchema.blockSchema,
  typeof multiColumnSchema.inlineContentSchema,
  typeof multiColumnSchema.styleSchema
>
```

The `RichTextEditor` `value` and `onChange` props use `EditorBlock[]`. All five editor forms replace their `import('@blocknote/core').Block[]` state type with `EditorBlock` imported from `@/components/editor/RichTextEditor`.

### Editor changes (`RichTextEditor.tsx`)

1. **Schema**: Use `withMultiColumn(BlockNoteSchema.create())` created at module level (not inside the component, to avoid recreation on each render).
2. **Drop cursor**: Pass `dropCursor: multiColumnDropCursor` to `useCreateBlockNote`.
3. **Dictionary**: Build locale-aware dictionary that merges base + multi-column locale:
   ```ts
   import { en, de, fr, es, pt } from '@blocknote/core/locales'
   import { locales as multiColumnLocales } from '@blocknote/xl-multi-column'

   // Named map avoids unsafe namespace string-indexing
   const BASE_LOCALES = { en, de, fr, es, pt }
   const LOCALE_MAP: Record<string, keyof typeof BASE_LOCALES> = {
     es: 'es', pt: 'pt', fr: 'fr', de: 'de', da: 'en', en: 'en',
   }

   // Inside component:
   const key = LOCALE_MAP[locale] ?? 'en'
   const dictionary = { ...BASE_LOCALES[key], ...multiColumnLocales[key] }
   ```
4. **Slash menu**: Switch `BlockNoteView` to `slashMenu={false}` + explicit `SuggestionMenuController`:
   ```ts
   import { combineByGroup, filterSuggestionItems } from '@blocknote/core'
   import { getDefaultReactSlashMenuItems, SuggestionMenuController } from '@blocknote/react'
   import { getMultiColumnSlashMenuItems } from '@blocknote/xl-multi-column'
   ```
   ```tsx
   <BlockNoteView editor={editor} slashMenu={false} ...>
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
   ```

### Reader changes (`blocknote-to-html.ts`)

Add two new cases to `blockToHtml`:

**`column` case** — wraps its children in a `<div class="bn-column">`:
```ts
case 'column':
  return `<div class="bn-column">${children}</div>`
```

**`columnList` case** — builds `grid-template-columns` from child `width` props. The `width` prop on each column is a `number` (BlockNote default is `1`; authors drag to resize). Convert each width to a `fr` unit. If a column has no `width` prop, treat it as `1`. If `block.children` is empty, fall back to `display: flex`:

```ts
case 'columnList': {
  const cols = (block.children ?? [])
  const frValues = cols.map((col) => `${(col.props?.width as number) ?? 1}fr`).join(' ')
  const style = cols.length > 0
    ? `display:grid;grid-template-columns:${frValues};gap:1.5rem`
    : 'display:flex;gap:1.5rem'
  return `<div class="bn-column-list" style="${style}">${children}</div>`
}
```

Note: In `blockToHtml`, `children` is already the rendered HTML of `block.children` via `blocksToHtml(block.children)`. The width inspection happens on the raw `block.children` array before that render, which is available in scope.

### Reader responsive CSS (`app/globals.css`)

Add to `app/globals.css` (not in `ArticleBody.tsx`, which is a React component with no CSS mechanism):

```css
@media (max-width: 768px) {
  .bn-column-list {
    grid-template-columns: 1fr !important;
  }
}

.bn-column > * + * {
  margin-top: 1rem;
}
```

### Translation (`blocknote-translate.ts`)

No changes needed. `walkBlocks` already recurses into `children` arrays, so `columnList` → `column` → paragraph content is extracted and re-injected correctly by the existing traversal.

---

## Files

| File | Change |
|---|---|
| `package.json` | Add `@blocknote/xl-multi-column` |
| `components/editor/RichTextEditor.tsx` | `locale` prop, `withMultiColumn` schema at module level, `EditorBlock` type re-export, locale-aware dictionary (base + multi-column merge), slash menu with column items, drop cursor |
| `app/[locale]/create/article/CreateArticleForm.tsx` | Replace `Block[]` state type with `EditorBlock`; pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx` | Replace `Block[]` state type with `EditorBlock`; pass `locale` to `RichTextEditor` |
| `app/[locale]/create/pill/CreatePillForm.tsx` | Replace `Block[]` state type with `EditorBlock`; pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` | Replace `Block[]` state type with `EditorBlock`; pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | Replace `Block[]` state type with `EditorBlock`; pass `locale` to `RichTextEditor` |
| `lib/blocknote-to-html.ts` | Add `columnList` and `column` cases with width-aware grid rendering |
| `app/globals.css` | Add responsive `.bn-column-list` and `.bn-column` CSS |

---

## Out of Scope

- Custom Danish BlockNote dictionary (falls back to English editor UI)
- Column support in the legacy Tiptap reader path (already deprecated, not worth extending)
- Per-column background colours or borders (not in BlockNote's default column schema)
