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
