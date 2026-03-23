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

BlockNote ships built-in dictionaries for `de`, `fr`, `es`, `pt`. Danish (`da`) has no built-in dictionary — the editor UI falls back to English for that locale. This only affects editor chrome; article content translation (via DeepL) is unaffected.

**Locale mapping:**

| App locale | BlockNote dictionary |
|---|---|
| `es` | `locales.es` |
| `pt` | `locales.pt` |
| `fr` | `locales.fr` |
| `de` | `locales.de` |
| `da` | `locales.en` (fallback) |
| `en` | `locales.en` |

### Call sites

All five editor forms already have access to the locale (via `useLocale()` from next-intl) and pass it as a prop to `RichTextEditor`.

---

## Feature 2: Multi-Column Layouts

### What

Authors can insert 2- or 3-column layouts into any content body via the slash menu. Columns are resizable by dragging in the editor. In the article reader, columns render side-by-side on desktop with widths proportional to the `width` props stored by the editor, and collapse to a single vertical stack on mobile (below 768px).

### Package

Requires `@blocknote/xl-multi-column` — a first-party BlockNote package in the same version family (v0.47.x).

### Editor changes (`RichTextEditor`)

1. **Schema**: Replace the implicit default schema with `withMultiColumn(BlockNoteSchema.create())`. This adds `columnList` and `column` block types.
2. **Drop cursor**: Replace the default with `multiColumnDropCursor` for correct drag-drop behaviour between columns.
3. **Slash menu**: Switch `BlockNoteView` to `slashMenu={false}` and add an explicit `SuggestionMenuController` that combines `getDefaultReactSlashMenuItems` with `getMultiColumnSlashMenuItems` via `combineByGroup`. This adds "2 columns" and "3 columns" entries to the slash menu.
4. **Dictionary**: When multi-column is active, merge `multiColumnLocales.<lang>` into the dictionary alongside the base locale dictionary. Multi-column locales are available for the same languages as the base dictionaries; `da` falls back to `multiColumnLocales.en`.

### Reader changes (`blocknote-to-html.ts`)

Add two new block type cases:

- **`columnList`**: Emits a `<div class="bn-column-list">` with an inline `grid-template-columns` style built from the `width` props of its child column blocks (e.g. `"1.4fr 0.8fr"`). Falls back to equal columns if no widths are set.
- **`column`**: Emits a `<div class="bn-column">` wrapping its children's HTML.

### Reader responsive CSS (`ArticleBody.tsx`)

Add prose override styles for `.bn-column-list` and `.bn-column`:

```css
.bn-column-list {
  display: grid;
  gap: 1.5rem;
}
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

No changes needed. `walkBlocks` already recurses into `children` arrays, so column block content is extracted and re-injected correctly by the existing traversal.

---

## Files

| File | Change |
|---|---|
| `package.json` | Add `@blocknote/xl-multi-column` |
| `components/editor/RichTextEditor.tsx` | `locale` prop, `withMultiColumn` schema, slash menu with column items, drop cursor, locale-aware dictionary |
| `app/[locale]/create/article/CreateArticleForm.tsx` | Pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/articles/[id]/edit/EditArticleForm.tsx` | Pass `locale` to `RichTextEditor` |
| `app/[locale]/create/pill/CreatePillForm.tsx` | Pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/pills/[id]/edit/EditPillForm.tsx` | Pass `locale` to `RichTextEditor` |
| `app/[locale]/dashboard/videos/[id]/edit/EditVideoForm.tsx` | Pass `locale` to `RichTextEditor` |
| `lib/blocknote-to-html.ts` | Add `columnList` and `column` cases with width-aware grid rendering |
| `components/content/ArticleBody.tsx` | Add responsive column CSS |

---

## Out of Scope

- Custom Danish BlockNote dictionary (falls back to English editor UI)
- Column support in the legacy Tiptap reader path (already deprecated, not worth extending)
- Per-column background colours or borders (not in BlockNote's default column schema)
