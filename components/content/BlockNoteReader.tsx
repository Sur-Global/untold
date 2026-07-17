'use client'
import { BlockNoteSchema } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { useMemo } from 'react'
import { renderCreditHtml } from '@/lib/photo-credit'

const schema = withMultiColumn(BlockNoteSchema.create())

interface BlockNoteReaderProps {
  blocks: unknown[]
  className?: string
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
}

// Image/file captions come out of blocksToHTMLLossy as plain escaped text inside
// <figcaption>. Decode it and re-render through renderCreditHtml so a `[label](url)`
// bracket-link the author typed into the caption becomes a real hyperlink.
function linkifyCaptions(html: string): string {
  return html.replace(
    /<figcaption>([\s\S]*?)<\/figcaption>/g,
    (_match, inner) => `<figcaption>${renderCreditHtml(decodeHtmlEntities(inner))}</figcaption>`
  )
}

export function BlockNoteReader({ blocks, className }: BlockNoteReaderProps) {
  // Create a minimal editor (no UI) just for HTML conversion
  const editor = useCreateBlockNote({ schema })
  const html = useMemo(
    () => linkifyCaptions(editor.blocksToHTMLLossy(blocks as any)),
    [editor, blocks]
  )

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
