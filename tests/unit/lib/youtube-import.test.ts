import { describe, it, expect } from 'vitest'
import { cleanDescription, descriptionBlocks, formatDuration, parseChapters } from '@/lib/youtube-import'

describe('formatDuration', () => {
  it('formats like the videos already on the site', () => {
    expect(formatDuration('PT28M13S')).toBe('28:13')
    expect(formatDuration('PT2M19S')).toBe('2:19')
    expect(formatDuration('PT1H22M18S')).toBe('1:22:18')
    expect(formatDuration('PT1H5M50S')).toBe('1:05:50')
    expect(formatDuration('PT45S')).toBe('0:45')
  })
})

describe('cleanDescription', () => {
  it('drops the channel footer ("Síguenos en…")', () => {
    const text = 'Una charla.\n\nOtro párrafo.\n\n🔗 Síguenos en:\nInstagram: @surglobal_la\nLinkedIn: Sur Global'
    expect(cleanDescription(text)).toBe('Una charla.\n\nOtro párrafo.')
  })
  it('leaves a description without footer as it is', () => {
    expect(cleanDescription('Solo texto.')).toBe('Solo texto.')
  })
})

describe('parseChapters', () => {
  it('reads timestamp lines when they start at 0:00 and there are at least three', () => {
    const d = 'Intro\n0:00 Bienvenida\n2:30 Primera parte\n1:05:10 Cierre'
    expect(parseChapters(d)).toEqual([
      { timestamp: '0:00', title: 'Bienvenida' },
      { timestamp: '2:30', title: 'Primera parte' },
      { timestamp: '1:05:10', title: 'Cierre' },
    ])
  })
  it('ignores a few stray timestamps', () => {
    expect(parseChapters('0:00 Inicio\n3:00 Fin')).toEqual([])
    expect(parseChapters('Sin capítulos.')).toEqual([])
  })
})

describe('descriptionBlocks', () => {
  it('makes one paragraph per block of text and turns links into links', () => {
    const blocks = descriptionBlocks('Primero.\nsigue aquí.\n\nMira https://surglobal.io ahora.')
    expect(blocks).toHaveLength(2)
    expect(blocks[0].content).toEqual([{ type: 'text', text: 'Primero. sigue aquí.', styles: {} }])
    expect(blocks[1].content).toEqual([
      { type: 'text', text: 'Mira ', styles: {} },
      { type: 'link', href: 'https://surglobal.io', content: [{ type: 'text', text: 'https://surglobal.io', styles: {} }] },
      { type: 'text', text: ' ahora.', styles: {} },
    ])
    expect(blocks[0]).toMatchObject({ type: 'paragraph', children: [] })
  })
  it('leaves chapter lines out of the text when chapters are stored apart', () => {
    const blocks = descriptionBlocks('Charla.\n\n0:00 Intro\n1:00 Tema\n2:00 Fin', 3)
    expect(blocks).toHaveLength(1)
  })
})
