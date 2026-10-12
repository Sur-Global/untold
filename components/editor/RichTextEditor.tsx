'use client'
import '@blocknote/mantine/style.css'
import '@blocknote/xl-ai/style.css'
import { Block, filterSuggestionItems, combineByGroup, insertOrUpdateBlockForSlashMenu } from '@blocknote/core'
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
import { useEffect, useRef, useState } from 'react'
import { createClient as createBrowserSupabase } from '@/lib/supabase/client'
import { contentSchema as multiColumnSchema } from '@/lib/blocknote-schema'

const BASE_LOCALES = { en, de, fr, es, pt }
const LOCALE_MAP: Record<string, keyof typeof BASE_LOCALES> = {
  es: 'es', pt: 'pt', fr: 'fr', de: 'de', da: 'en', en: 'en',
}

export type EditorBlock = Block<
  typeof multiColumnSchema.blockSchema,
  typeof multiColumnSchema.inlineContentSchema,
  typeof multiColumnSchema.styleSchema
>

// What the editor offers for videos:
//   none   — no video/audio/file at all (knowledge pills)
//   embed  — paste a YouTube/Vimeo/video link (every creator)
//   upload — embed, plus uploading video files (editors and admins only)
// Leave unset to use the signed-in user's role.
export type VideoMode = 'none' | 'embed' | 'upload'

const EMBED_ITEM_TEXT: Record<string, { title: string; subtext: string }> = {
  en: { title: 'Video embed', subtext: 'YouTube, Vimeo or a video link' },
  es: { title: 'Insertar video', subtext: 'YouTube, Vimeo o un enlace de video' },
  pt: { title: 'Incorporar vídeo', subtext: 'YouTube, Vimeo ou um link de vídeo' },
  fr: { title: 'Intégrer une vidéo', subtext: 'YouTube, Vimeo ou un lien vidéo' },
  de: { title: 'Video einbetten', subtext: 'YouTube, Vimeo oder ein Videolink' },
  da: { title: 'Indlejr video', subtext: 'YouTube, Vimeo eller et videolink' },
}

let capabilityRequest: Promise<boolean> | null = null
function useCanUploadVideo(skip: boolean): boolean {
  const [can, setCan] = useState(false)
  useEffect(() => {
    if (skip) return
    capabilityRequest ??= fetch('/api/capabilities')
      .then((r) => r.json())
      .then((d) => !!d.canUploadVideo)
      .catch(() => false)
    capabilityRequest.then(setCan)
  }, [skip])
  return can
}

interface RichTextEditorProps {
  value?: EditorBlock[] | null
  // `silent` is true for programmatic updates (initial legacy-HTML conversion,
  // external value sync) so callers can update their own state without treating
  // it as a user edit (e.g. skip triggering an autosave).
  onChange: (blocks: EditorBlock[], opts?: { silent?: boolean }) => void
  placeholder?: string
  locale?: string
  initialHtml?: string | null
  videos?: VideoMode
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

async function uploadVideoToSupabase(file: File): Promise<string> {
  const res = await fetch('/api/upload/video', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ contentType: file.type, size: file.size }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error ?? 'Video upload failed')
  const { error } = await createBrowserSupabase().storage
    .from('content-videos')
    .uploadToSignedUrl(body.path, body.token, file)
  if (error) throw new Error(error.message)
  return body.publicUrl
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start writing\u2026',
  locale = 'en',
  initialHtml,
  videos,
}: RichTextEditorProps) {
  const canUploadVideo = useCanUploadVideo(videos !== undefined)
  const mode: VideoMode = videos ?? (canUploadVideo ? 'upload' : 'embed')
  // The editor is created once; uploads and the slash menu read the current mode through this ref
  const modeRef = useRef<VideoMode>(mode)
  modeRef.current = mode

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
    uploadFile: async (file: File) => {
      if (file.type.startsWith('video/')) {
        if (modeRef.current !== 'upload') throw new Error('Only editors can upload videos')
        return uploadVideoToSupabase(file)
      }
      if (modeRef.current === 'none' && !file.type.startsWith('image/')) throw new Error('Only images can be added here')
      return uploadImageToSupabase(file)
    },
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
          getItems={async (query) => {
            const current = modeRef.current
            const text = EMBED_ITEM_TEXT[locale] ?? EMBED_ITEM_TEXT.en
            const embedItems =
              current === 'none'
                ? []
                : [
                    {
                      title: text.title,
                      subtext: text.subtext,
                      aliases: ['video', 'embed', 'youtube', 'vimeo'],
                      group: dictionary.slash_menu.video.group,
                      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'videoEmbed' } as any),
                    },
                  ]
            // Pills: no video/audio/file at all. Creators: embed only (no file-upload "Video" block).
            const blocked = current === 'none' ? ['video', 'audio', 'file'] : current === 'embed' ? ['video'] : []
            const defaults = getDefaultReactSlashMenuItems(editor).filter(
              (item) => !blocked.includes((item as { key?: string }).key ?? ''),
            )
            return filterSuggestionItems(
              combineByGroup(
                defaults,
                embedItems,
                getMultiColumnSlashMenuItems(editor),
                getAISlashMenuItems(editor),
              ),
              query,
            )
          }}
        />
      </BlockNoteView>
    </div>
    <p className="mt-1.5 text-xs text-muted-foreground">
      Tip: to add a hyperlink to an image caption, type it as <code>[label](https://...)</code>.
    </p>
    </div>
  )
}
