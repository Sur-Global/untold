import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'
import { ImageWithCredit } from '@/lib/tiptap/image-with-credit'
import { blockNoteToHtml } from '@/lib/blocknote-to-html'

interface ArticleBodyProps {
  json: Record<string, unknown> | unknown[]
}

function toHtml(json: ArticleBodyProps['json']): string {
  // BlockNote format is an array of blocks
  if (Array.isArray(json)) {
    return blockNoteToHtml(json)
  }
  // Legacy Tiptap/ProseMirror format
  try {
    return generateHTML(json as any, [
      StarterKit.configure({ link: false }),
      ImageWithCredit,
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ])
  } catch {
    return '<p>Unable to render content.</p>'
  }
}

export function ArticleBody({ json }: ArticleBodyProps) {
  const html = toHtml(json)

  return (
    <div
      className="
        prose prose-stone max-w-none

        prose-p:text-foreground prose-p:text-[18px] prose-p:leading-[1.625] prose-p:mb-6

        prose-h1:font-['Audiowide'] prose-h1:uppercase prose-h1:text-foreground
          prose-h1:text-[50px] prose-h1:leading-[1.232] prose-h1:tracking-[-0.56px]
          prose-h1:mt-10 prose-h1:mb-6
        prose-h2:font-['Audiowide'] prose-h2:uppercase prose-h2:text-foreground
          prose-h2:text-[35px] prose-h2:leading-[1.371] prose-h2:tracking-[-0.4px]
          prose-h2:mt-10 prose-h2:mb-5
        prose-h3:font-['Audiowide'] prose-h3:uppercase prose-h3:text-foreground
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

        [&_blockquote_p:first-of-type]:before:content-none
        [&_blockquote_p:last-of-type]:after:content-none

        prose-a:text-primary prose-a:no-underline hover:prose-a:underline
        prose-code:text-primary prose-code:bg-primary/8
        prose-pre:bg-foreground prose-pre:text-background
        prose-strong:text-foreground prose-strong:font-semibold
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
