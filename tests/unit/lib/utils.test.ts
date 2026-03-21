import { describe, it, expect } from 'vitest'
import { slugify, readTime, cn } from '@/lib/utils'

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
