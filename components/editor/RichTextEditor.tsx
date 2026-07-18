'use client'
import '@blocknote/mantine/style.css'
import '@blocknote/xl-ai/style.css'
import { Block, BlockNoteSchema, filterSuggestionItems, combineByGroup } from '@blocknote/core'
import { en, de, fr, es, pt } from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/mantine'
import {
  useCreateBlockNote,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
} from '@blocknote/react'
import {
  withMultiColumn,
  multiColumnDropCursor,
  getMultiColumnSlashMenuItems,
  locales as multiColumnLocales,
} from '@blocknote/xl-multi-column'
import {
  AIExtension,
  AIMenuController,
  AIToolbarButton,
  getAISlashMenuItems,
} from '@blocknote/xl-ai'
import { en as aiEn } from '@blocknote/xl-ai/locales'
import { DefaultChatTransport } from 'ai'
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
  // `silent` is true for programmatic updates (initial legacy-HTML conversion,
  // external value sync) so callers can update their own state without treating
  // it as a user edit (e.g. skip triggering an autosave).
  onChange: (blocks: EditorBlock[], opts?: { silent?: boolean }) => void
  placeholder?: string
  locale?: string
  initialHtml?: string | null
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
  initialHtml,
}: RichTextEditorProps) {
  const initialContentRef = useRef(value ?? undefined)
  const initialHtmlRef = useRef(initialHtml)

  const key = LOCALE_MAP[locale] ?? 'en'
  const dictionary = {
    ...BASE_LOCALES[key],
    multi_column: multiColumnLocales[key] ?? multiColumnLocales.en,
    ai: aiEn,
  } as typeof BASE_LOCALES[typeof key]

  const editor = useCreateBlockNote({
    schema: multiColumnSchema,
    initialContent: initialContentRef.current ?? undefined,
    uploadFile: uploadImageToSupabase,
    placeholders: { default: placeholder },
    dropCursor: multiColumnDropCursor,
    dictionary,
    tables: {
      splitCells: true,
      cellBackgroundColor: true,
      cellTextColor: true,
      headers: true,
    },
    extensions: [
      AIExtension({
        transport: new DefaultChatTransport({
          api: '/api/ai',
        }),
      }),
    ],
  })

  // replaceBlocks() below is programmatic, not a user edit — it still fires
  // BlockNoteView's onChange, which would otherwise mark the form "unsaved"
  // and autosave fresh (non-deterministic) block ids on every mount for
  // legacy content, silently invalidating other locales' translations on
  // each page load even though nothing was actually edited.
  const suppressNextChangeRef = useRef(false)

  // Sync external value changes (e.g. locale switch loads different content)
  useEffect(() => {
    if (!editor || !value) return
    const current = JSON.stringify(editor.document)
    if (current !== JSON.stringify(value)) {
      suppressNextChangeRef.current = true
      editor.replaceBlocks(editor.document, value as any[])
    }
  }, [editor, value])

  // Convert legacy ProseMirror HTML to BlockNote blocks on first mount
  useEffect(() => {
    if (!editor || !initialHtmlRef.current || value) return
    const blocks = editor.tryParseHTMLToBlocks(initialHtmlRef.current)
    suppressNextChangeRef.current = true
    editor.replaceBlocks(editor.document, blocks as any[])
  }, [editor]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
    <div
      className="rounded-lg overflow-hidden bg-white"
      style={{ border: '1px solid rgba(139,69,19,0.25)', minHeight: 320 }}
    >
      <BlockNoteView
        editor={editor}
        theme="light"
        style={{ fontFamily: 'Inter, sans-serif', background: '#ffffff' }}
        formattingToolbar={false}
        slashMenu={false}
        onChange={() => {
          const silent = suppressNextChangeRef.current
          suppressNextChangeRef.current = false
          onChange(editor.document as EditorBlock[], { silent })
        }}
      >
        <AIMenuController />
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems()}
              <AIToolbarButton />
            </FormattingToolbar>
          )}
        />
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              combineByGroup(
                getDefaultReactSlashMenuItems(editor),
                getMultiColumnSlashMenuItems(editor),
                getAISlashMenuItems(editor),
              ),
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
    <p className="mt-1.5 text-xs text-muted-foreground">
      Tip: to add a hyperlink to an image caption, type it as <code>[label](https://...)</code>.
    </p>
    </div>
  )
}
