import { describe, it, expect } from 'vitest'
import { extractTextNodes, injectTextNodes } from '@/lib/tiptap-translate'

const simpleParagraph = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Hello world' }],
    },
  ],
}

const multiText = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'First' },
        { type: 'text', text: ' second' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Third' }],
    },
  ],
}

const withCodeBlock = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Before code' }] },
    {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const x = 1' }],
    },
    { type: 'paragraph', content: [{ type: 'text', text: 'After code' }] },
  ],
}

const withCodeMark = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Call ' },
        { type: 'text', text: 'foo()', marks: [{ type: 'code' }] },
        { type: 'text', text: ' now' },
      ],
    },
  ],
}

describe('extractTextNodes', () => {
  it('extracts text from a simple paragraph', () => {
    const { texts } = extractTextNodes(simpleParagraph)
    expect(texts).toEqual(['Hello world'])
  })

  it('extracts all text nodes in document order', () => {
    const { texts } = extractTextNodes(multiText)
    expect(texts).toEqual(['First', ' second', 'Third'])
  })

  it('skips codeBlock content', () => {
    const { texts } = extractTextNodes(withCodeBlock)
    expect(texts).toEqual(['Before code', 'After code'])
    expect(texts).not.toContain('const x = 1')
  })

  it('skips text nodes with code mark', () => {
    const { texts } = extractTextNodes(withCodeMark)
    expect(texts).toEqual(['Call ', ' now'])
    expect(texts).not.toContain('foo()')
  })

  it('handles empty doc without crashing', () => {
    const { texts, paths } = extractTextNodes({ type: 'doc', content: [] })
    expect(texts).toEqual([])
    expect(paths).toEqual([])
  })

  it('returns paths with same length as texts', () => {
    const { texts, paths } = extractTextNodes(multiText)
    expect(paths).toHaveLength(texts.length)
  })
})

describe('injectTextNodes', () => {
  it('injects translations at the correct positions', () => {
    const { texts, paths } = extractTextNodes(multiText)
    const translations = texts.map((t) => `[${t}]`)
    const result = injectTextNodes(multiText, translations, paths)
    const { texts: afterTexts } = extractTextNodes(result)
    expect(afterTexts).toEqual(['[First]', '[ second]', '[Third]'])
  })

  it('does not mutate the original document', () => {
    const { paths } = extractTextNodes(simpleParagraph)
    injectTextNodes(simpleParagraph, ['Hola mundo'], paths)
    expect(simpleParagraph.content[0].content[0].text).toBe('Hello world')
  })

  it('is the inverse of extractTextNodes', () => {
    const { texts, paths } = extractTextNodes(multiText)
    const reversed = texts.map((t) => t.split('').reverse().join(''))
    const result = injectTextNodes(multiText, reversed, paths)
    const { texts: afterTexts } = extractTextNodes(result)
    expect(afterTexts).toEqual(texts.map((t) => t.split('').reverse().join('')))
  })
})
