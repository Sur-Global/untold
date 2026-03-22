'use client'
import '@blocknote/mantine/style.css'
import type { Block } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { useEffect, useRef } from 'react'

interface RichTextEditorProps {
  value?: Block[] | null
  onChange: (blocks: Block[]) => void
  placeholder?: string
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

export function RichTextEditor({ value, onChange, placeholder = 'Start writing\u2026' }: RichTextEditorProps) {
  const initialContentRef = useRef(value ?? undefined)

  const editor = useCreateBlockNote({
    initialContent: initialContentRef.current ?? undefined,
    uploadFile: uploadImageToSupabase,
    placeholders: { default: placeholder },
  })

  // Sync external value when it changes (e.g. locale switch loads different content)
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
        onChange={() => onChange(editor.document as Block[])}
        theme="light"
        style={{ fontFamily: 'Inter, sans-serif', background: '#ffffff' }}
      />
    </div>
  )
}
