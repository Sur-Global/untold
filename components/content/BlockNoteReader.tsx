'use client'
import { useCreateBlockNote } from '@blocknote/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { renderCreditHtml } from '@/lib/photo-credit'
import { blocksToReaderHtml, needsReactRender, type FootnoteLabels } from '@/lib/blocknote-html'
import { sanitizeReaderHtml } from '@/lib/sanitize-html'
import { contentSchema as schema } from '@/lib/blocknote-schema'

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
  const t = useTranslations('footnotes')
  const asyncRender = useMemo(() => needsReactRender(blocks as any[]), [blocks])
  const makeHtml = useMemo(
    () => () => {
      const labels: FootnoteLabels = { title: t('title'), back: t('back'), note: (n) => t('noteLabel', { n }) }
      return sanitizeReaderHtml(linkifyCaptions(blocksToReaderHtml(editor, blocks as any[], labels)))
    },
    [editor, blocks, t],
  )
  // Plain bodies convert at once. Bodies with footnotes or video embeds are converted right after React has rendered
  // (BlockNote draws those with React, which cannot happen in the middle of a render).
  const plainHtml = useMemo(() => (asyncRender ? '' : makeHtml()), [asyncRender, makeHtml])
  const [laterHtml, setLaterHtml] = useState('')
  useEffect(() => {
    if (!asyncRender) return
    let current = true
    queueMicrotask(() => {
      if (current) setLaterHtml(makeHtml())
    })
    return () => {
      current = false
    }
  }, [asyncRender, makeHtml])
  const html = asyncRender ? laterHtml : plainHtml

  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
