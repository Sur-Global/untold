'use client'
import '@blocknote/mantine/style.css'
import { BlockNoteSchema } from '@blocknote/core'
import { BlockNoteView } from '@blocknote/mantine'
import { useCreateBlockNote } from '@blocknote/react'
import { withMultiColumn, multiColumnDropCursor } from '@blocknote/xl-multi-column'
import { useEffect } from 'react'

interface BlockNoteReaderProps {
  blocks: unknown[]
}

export function BlockNoteReader({ blocks }: BlockNoteReaderProps) {
  const editor = useCreateBlockNote({
    schema: withMultiColumn(BlockNoteSchema.create()),
    initialContent: blocks as any,
    dropCursor: multiColumnDropCursor,
  })

  useEffect(() => {
    editor.isEditable = false
  }, [editor])

  return (
    <div className="bn-article-body">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  )
}
