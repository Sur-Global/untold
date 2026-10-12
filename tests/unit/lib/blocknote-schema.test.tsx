import { describe, it, expect } from 'vitest'
import { BlockNoteEditor } from '@blocknote/core'
import { contentSchema } from '@/lib/blocknote-schema'
import { blocksToReaderHtml } from '@/lib/blocknote-html'
import { sanitizeReaderHtml } from '@/lib/sanitize-html'

describe('contentSchema with the video embed block', () => {
  const editor = BlockNoteEditor.create({ schema: contentSchema })

  it('renders a YouTube embed as a privacy-friendly iframe in the reader HTML', () => {
    const html = blocksToReaderHtml(editor as any, [
      { id: '1', type: 'videoEmbed', props: { url: 'https://youtu.be/dQw4w9WgXcQ' }, children: [] },
    ])
    expect(html).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
    expect(sanitizeReaderHtml(html)).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ')
  })

  it('renders nothing for an unsupported link (no arbitrary iframes)', () => {
    const html = blocksToReaderHtml(editor as any, [
      { id: '1', type: 'videoEmbed', props: { url: 'https://evil.example.com/x' }, children: [] },
    ])
    expect(html).not.toContain('iframe')
  })

  it('still converts ordinary blocks', () => {
    const html = blocksToReaderHtml(editor as any, [
      { id: '1', type: 'paragraph', content: [{ type: 'text', text: 'Hello', styles: {} }], children: [] },
    ])
    expect(html).toContain('Hello')
  })
})
