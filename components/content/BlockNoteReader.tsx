'use client'
import { BlockNoteSchema } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { useMemo } from 'react'

const schema = withMultiColumn(BlockNoteSchema.create())

interface BlockNoteReaderProps {
  blocks: unknown[]
  className?: string
}

export function BlockNoteReader({ blocks, className }: BlockNoteReaderProps) {
  // Create a minimal editor (no UI) just for HTML conversion
  const editor = useCreateBlockNote({ schema })
  const html = useMemo(() => editor.blocksToHTMLLossy(blocks as any), [editor, blocks])

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
