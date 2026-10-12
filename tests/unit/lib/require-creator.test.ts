import { describe, it, expect } from 'vitest'
import { isCreatorRole, canCreateType } from '@/lib/require-creator'

// We test only the pure classification logic extracted from the guard.
// The actual redirect/createClient calls are tested via Playwright e2e.

describe('isCreatorRole', () => {
  it('returns true for admin', () => {
    expect(isCreatorRole('admin')).toBe(true)
  })
  it('returns true for author', () => {
    expect(isCreatorRole('author')).toBe(true)
  })
  it('returns true for editor', () => {
    expect(isCreatorRole('editor')).toBe(true)
  })
  it('returns true for a plain member (anyone can create)', () => {
    expect(isCreatorRole('user')).toBe(true)
  })
  it('returns false for null', () => {
    expect(isCreatorRole(null)).toBe(false)
  })
})

describe('canCreateType', () => {
  it('lets every member create articles, videos and pills', () => {
    for (const role of ['user', 'author', 'editor', 'admin'] as const) {
      for (const type of ['article', 'video', 'pill'] as const) expect(canCreateType(role, type)).toBe(true)
    }
  })
  it('limits podcasts and courses to admins and editors', () => {
    for (const type of ['podcast', 'course'] as const) {
      expect(canCreateType('admin', type)).toBe(true)
      expect(canCreateType('editor', type)).toBe(true)
      expect(canCreateType('author', type)).toBe(false)
      expect(canCreateType('user', type)).toBe(false)
    }
  })
  it('rejects logged-out visitors', () => {
    expect(canCreateType(null, 'article')).toBe(false)
  })
})
