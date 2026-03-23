'use client'
import '@blocknote/mantine/style.css'
import { Block, BlockNoteSchema, filterSuggestionItems, combineByGroup } from '@blocknote/core'
import { en, de, fr, es, pt } from '@blocknote/core/locales'
import { BlockNoteView } from '@blocknote/mantine'
import {
  useCreateBlockNote,
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
    multi_column: multiColumnLocales[key] ?? multiColumnLocales.en,
  } as typeof BASE_LOCALES[typeof key]

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
      editor.replaceBlocks(editor.document, value as any[])
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
        onChange={() => onChange(editor.document as EditorBlock[])}
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
