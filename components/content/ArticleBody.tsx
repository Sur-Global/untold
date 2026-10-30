'use client'
import dynamic from 'next/dynamic'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { ImageWithCredit } from '@/lib/tiptap/image-with-credit'

// Dynamic import prevents BlockNote (which accesses window at module level) from
// running during SSR, even within a 'use client' component tree
const BlockNoteReader = dynamic(() => import('./BlockNoteReader').then(m => m.BlockNoteReader), { ssr: false })

interface ArticleBodyProps {
  json: Record<string, unknown> | unknown[]
  /** 'static' = standalone pages (About…): photo grids are shown as clean round portraits */
  variant?: 'article' | 'static'
}

const PROSE_CLASS = `
  prose prose-stone max-w-none

  prose-p:text-foreground prose-p:text-[18px] prose-p:leading-[1.625] prose-p:mb-6

  prose-h1:font-heading prose-h1:text-foreground
    prose-h1:text-[50px] prose-h1:leading-[1.232] prose-h1:tracking-[-0.56px]
    prose-h1:mt-10 prose-h1:mb-6
  prose-h2:font-heading prose-h2:text-foreground
    prose-h2:text-[35px] prose-h2:leading-[1.371] prose-h2:tracking-[-0.4px]
    prose-h2:mt-10 prose-h2:mb-5
  prose-h3:font-heading prose-h3:text-foreground
    prose-h3:text-[24px] prose-h3:leading-[1.3]
    prose-h3:mt-8 prose-h3:mb-4

  prose-ul:pl-5 prose-ul:mb-6 prose-ul:space-y-3
  prose-li:text-foreground prose-li:text-[16px] prose-li:leading-[1.5]
  marker:text-primary

  [&_blockquote]:border-l-4 [&_blockquote]:border-primary
    [&_blockquote]:bg-primary/5 [&_blockquote]:rounded-2xl
    [&_blockquote]:pl-7 [&_blockquote]:pr-6 [&_blockquote]:py-6
    [&_blockquote]:text-foreground [&_blockquote]:text-[18px]
    [&_blockquote]:leading-[1.625] [&_blockquote]:not-italic [&_blockquote]:my-8

  prose-img:rounded-2xl prose-img:my-0 prose-img:w-full prose-img:shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)]

  [&_figure.article-image]:my-8
  [&_figure.article-image_img]:rounded-2xl [&_figure.article-image_img]:w-full [&_figure.article-image_img]:shadow-[0px_4px_16px_0px_rgba(44,36,32,0.1),0px_8px_32px_0px_rgba(44,36,32,0.06)] [&_figure.article-image_img]:mb-0
  [&_figure.article-image_figcaption]:text-sm [&_figure.article-image_figcaption]:mt-3
    [&_figure.article-image_figcaption]:px-4 [&_figure.article-image_figcaption]:py-4
    [&_figure.article-image_figcaption]:rounded-[10px]
    [&_figure.article-image_figcaption]:text-[#78716c]
    [&_figure.article-image_figcaption]:leading-[1.43]
    [&_figure.article-image_figcaption]:bg-[rgba(120,113,108,0.1)]
    [&_figure.article-image_figcaption]:text-center

  [&_blockquote_p:first-of-type]:before:content-none
  [&_blockquote_p:last-of-type]:after:content-none

  [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:my-8 [&_table]:border-collapse
    [&_table]:text-[14px] [&_table]:leading-[1.45]
  [&_th]:border [&_th]:border-foreground/15 [&_th]:bg-[rgba(120,113,108,0.1)] [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:align-top
    [&_th]:min-w-[6rem] [&_th]:font-semibold
  [&_td]:border [&_td]:border-foreground/15 [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_td]:min-w-[6rem]
  [&_th_p]:m-0 [&_th_p]:text-[14px] [&_th_p]:leading-[1.45] [&_td_p]:m-0 [&_td_p]:text-[14px] [&_td_p]:leading-[1.45]

  [&_.fn-ref]:ml-px [&_.fn-ref]:text-[0.75em] [&_.fn-ref]:leading-none
  [&_.fn-ref_a]:font-semibold [&_.fn-ref_a]:px-[2px] [&_.fn-ref_a]:scroll-mt-24 [&_.fn-ref_a]:no-underline [&_.fn-ref_a]:text-[#3b3680]

  [&_.fn-section]:mt-14 [&_.fn-section]:border-t [&_.fn-section]:border-foreground/15 [&_.fn-section]:pt-6
  [&_.fn-title]:m-0 [&_.fn-title]:mb-3 [&_.fn-title]:text-xs [&_.fn-title]:font-medium [&_.fn-title]:uppercase
    [&_.fn-title]:tracking-[0.08em] [&_.fn-title]:text-[#78716c] [&_.fn-title]:font-sans
  [&_.fn-list]:m-0 [&_.fn-list]:space-y-2 [&_.fn-list]:pl-6
  [&_.fn-list_li]:scroll-mt-24 [&_.fn-list_li]:rounded-md [&_.fn-list_li:target]:bg-[#EEEDFB]
  [&_.fn-list_p]:m-0 [&_.fn-list_p]:text-[14px] [&_.fn-list_p]:leading-[1.55] [&_.fn-list_p]:text-[#57534e]
  [&_.fn-back]:ml-1 [&_.fn-back]:no-underline [&_.fn-back]:text-[#3b3680]
  [&_.fn-list_li::marker]:text-[#57534e]

  prose-a:text-primary prose-a:no-underline hover:prose-a:underline
  prose-code:text-primary prose-code:bg-primary/8
  prose-pre:bg-foreground prose-pre:text-background
  prose-strong:text-foreground prose-strong:font-semibold
`

export function ArticleBody({ json, variant = 'article' }: ArticleBodyProps) {
  const proseClass = variant === 'static' ? `${PROSE_CLASS} static-page-body` : PROSE_CLASS
  // BlockNote format — convert to HTML via blocksToHTMLLossy, render with prose styles
  if (Array.isArray(json)) {
    return <BlockNoteReader blocks={json} className={proseClass} />
  }

  // Legacy Tiptap/ProseMirror format
  let html: string
  try {
    html = generateHTML(json as any, [
      StarterKit.configure({ link: false }),
      Link,
      ImageWithCredit,
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ])
  } catch {
    html = '<p>Unable to render content.</p>'
  }

  // Post-process: replace figcaptions that carry a data-credit-html attribute
  // (set by ImageWithCredit when creditHtml is used) with their real inner HTML.
  html = html.replace(
    /<figcaption([^>]*)\bdata-credit-html="([^"]*)"([^>]*)><\/figcaption>/g,
    (_match, before, encoded, after) => {
      const decoded = encoded
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&')
      // Strip the data attr from the rendered element to keep the HTML clean
      const attrs = (before + after).replace(/\s*data-credit-html="[^"]*"/, '').trim()
      return `<figcaption${attrs ? ' ' + attrs : ''}>${decoded}</figcaption>`
    }
  )

  return (
    <div
      className={proseClass}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
