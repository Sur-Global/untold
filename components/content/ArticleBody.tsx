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
      className="
        prose prose-stone max-w-none

        prose-p:text-[#2c2420] prose-p:text-[18px] prose-p:leading-[1.625] prose-p:mb-6

        prose-h1:font-['Audiowide'] prose-h1:uppercase prose-h1:text-[#2c2420] prose-h1:text-[50px] prose-h1:leading-[1.232] prose-h1:tracking-[-0.56px] prose-h1:mt-10 prose-h1:mb-6
        prose-h2:font-['Audiowide'] prose-h2:uppercase prose-h2:text-[#2c2420] prose-h2:text-[35px] prose-h2:leading-[1.371] prose-h2:tracking-[-0.4px] prose-h2:mt-10 prose-h2:mb-5
        prose-h3:font-['Audiowide'] prose-h3:uppercase prose-h3:text-[#2c2420] prose-h3:text-[24px] prose-h3:leading-[1.3] prose-h3:mt-8 prose-h3:mb-4

        prose-ul:pl-5 prose-ul:mb-6 prose-ul:space-y-3
        prose-li:text-[#2c2420] prose-li:text-[16px] prose-li:leading-[1.5] marker:text-[#a0522d]

        prose-blockquote:border-l-[4px] prose-blockquote:border-[#a0522d] prose-blockquote:bg-[rgba(160,82,45,0.05)] prose-blockquote:rounded-r-2xl prose-blockquote:pl-7 prose-blockquote:pr-6 prose-blockquote:py-6 prose-blockquote:text-[#2c2420] prose-blockquote:text-[18px] prose-blockquote:leading-[1.625] prose-blockquote:not-italic prose-blockquote:my-8

        prose-a:text-[#A0522D] prose-a:no-underline hover:prose-a:underline
        prose-code:text-[#A0522D] prose-code:bg-[rgba(160,82,45,0.08)]
        prose-pre:bg-[#1C1712] prose-pre:text-[#E8E6E3]
        prose-strong:text-[#2c2420] prose-strong:font-semibold
      "
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
