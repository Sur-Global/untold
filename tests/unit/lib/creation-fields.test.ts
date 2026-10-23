import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Every box where someone writes, in the creation and edit pages of articles, videos, podcasts, pills and courses,
// must look the same: white with the brand border. The shared look is FIELD_CLASS.
const root = join(process.cwd(), 'app', '[locale]')
const forms = [
  ...['article', 'video', 'podcast', 'pill', 'course'].map((kind) => join(root, 'create', kind, `Create${kind[0].toUpperCase()}${kind.slice(1)}Form.tsx`)),
  ...['articles', 'videos', 'podcasts', 'pills', 'courses']
    .map((dir) => {
      const kind = dir.slice(0, -1)
      return join(root, 'dashboard', dir, '[id]', 'edit', `Edit${kind[0].toUpperCase()}${kind.slice(1)}Form.tsx`)
    }),
]

describe('writing boxes in the creation and edit pages', () => {
  it('finds the ten forms', () => {
    expect(forms).toHaveLength(10)
    for (const file of forms) expect(existsSync(file)).toBe(true)
  })

  for (const file of forms) {
    it(`${file.split('app')[1]} uses the shared look on every <Input> (and none is transparent)`, () => {
      const source = readFileSync(file, 'utf8')
      const inputs = source.match(/<Input\b[\s\S]*?\/>/g) ?? []
      for (const input of inputs) expect(input).toContain('FIELD_CLASS')
      for (const field of source.match(/<(?:input|textarea|select)\b(?:[^>=]|=(?!>)|=>)*>/g) ?? []) {
        if (/type="(hidden|checkbox|radio|file|color)"/.test(field)) continue
        expect(field).toMatch(/bg-white|FIELD_CLASS|fieldClass/)
      }
    })
  }
})
