import { describe, it, expect } from 'vitest'
import { isEditorRole } from '@/lib/require-editor'

// We test only the pure classification logic extracted from the guard.
// The actual redirect/createClient calls are tested via Playwright e2e.

describe('isEditorRole', () => {
  it('returns true for admin', () => {
    expect(isEditorRole('admin')).toBe(true)
  })
  it('returns true for editor', () => {
    expect(isEditorRole('editor')).toBe(true)
  })
  it('returns false for author', () => {
    expect(isEditorRole('author')).toBe(false)
  })
  it('returns false for user', () => {
    expect(isEditorRole('user')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isEditorRole(null)).toBe(false)
  })
})
