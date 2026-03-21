import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Table, TableRow, TableCell, TableHeader } from '@tiptap/extension-table'

interface ArticleBodyProps {
  json: Record<string, unknown>
}

export function ArticleBody({ json }: ArticleBodyProps) {
  let html = ''
  try {
    html = generateHTML(json as any, [
      StarterKit,
      Underline,
      Table,
      TableRow,
      TableCell,
      TableHeader,
    ])
  } catch {
    html = '<p>Unable to render content.</p>'
  }

  return (
    <div
      className="prose prose-stone max-w-none
        prose-headings:font-['Audiowide'] prose-headings:uppercase
        prose-a:text-[#A0522D] prose-a:no-underline hover:prose-a:underline
        prose-blockquote:border-l-[#A0522D] prose-blockquote:text-[#6B5F58]
        prose-code:text-[#A0522D] prose-code:bg-[rgba(160,82,45,0.08)]
        prose-pre:bg-[#1C1712] prose-pre:text-[#E8E6E3]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
