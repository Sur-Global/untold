import { describe, it, expect } from 'vitest'
import { slugify, readTime, cn, getEditPath } from '@/lib/utils'

describe('slugify', () => {
  it('converts title to kebab-case slug', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })
  it('strips special characters', () => {
    expect(slugify('Decolonial Tech: A Guide!')).toBe('decolonial-tech-a-guide')
  })
  it('truncates to 80 chars', () => {
    const long = 'a'.repeat(100)
    expect(slugify(long).length).toBeLessThanOrEqual(80)
  })
})

describe('readTime', () => {
  it('returns 1 for short text', () => {
    expect(readTime('word '.repeat(100))).toBe(1)
  })
  it('returns correct minutes for longer text', () => {
    expect(readTime('word '.repeat(400))).toBe(2)
  })
})

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })
  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, 'bar')).toBe('foo bar')
  })
})

describe('getEditPath', () => {
  it('returns article edit path', () => {
    expect(getEditPath('article', 'abc')).toBe('/dashboard/articles/abc/edit')
  })
  it('returns video edit path', () => {
    expect(getEditPath('video', 'abc')).toBe('/dashboard/videos/abc/edit')
  })
  it('returns podcast edit path', () => {
    expect(getEditPath('podcast', 'abc')).toBe('/dashboard/podcasts/abc/edit')
  })
  it('returns pill edit path', () => {
    expect(getEditPath('pill', 'abc')).toBe('/dashboard/pills/abc/edit')
  })
  it('returns course edit path', () => {
    expect(getEditPath('course', 'abc')).toBe('/dashboard/courses/abc/edit')
  })
})
