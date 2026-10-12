import { describe, it, expect } from 'vitest'
import { stripNewMediaBlocks } from '@/lib/body-policy'

const p = (id: string, children: any[] = []) => ({ id, type: 'paragraph', children })
const media = (id: string, type = 'video') => ({ id, type, props: { url: 'https://x/y.mp4' }, children: [] })

describe('stripNewMediaBlocks', () => {
  it('removes new video, audio, file and embed blocks', () => {
    const body = [p('a'), media('v1'), media('v2', 'audio'), media('v3', 'file'), media('v4', 'videoEmbed'), p('b')]
    expect(stripNewMediaBlocks(body, []).map((b: any) => b.id)).toEqual(['a', 'b'])
  })

  it('removes them when nested inside other blocks', () => {
    const body = [p('a', [media('v1'), p('c')])]
    expect(stripNewMediaBlocks(body, [])).toEqual([{ id: 'a', type: 'paragraph', children: [p('c')] }])
  })

  it('keeps media blocks that were already stored (older content is never silently cut)', () => {
    const existing = [p('a'), media('old')]
    const body = [p('a'), media('old'), media('new')]
    expect(stripNewMediaBlocks(body, existing).map((b: any) => b.id)).toEqual(['a', 'old'])
  })

  it('leaves images and non-array bodies alone', () => {
    const body = [{ id: 'i', type: 'image', props: {}, children: [] }]
    expect(stripNewMediaBlocks(body, [])).toEqual(body)
    expect(stripNewMediaBlocks(null, [])).toBeNull()
  })
})
