import { describe, it, expect } from 'vitest'
import { isCreatorRole } from '@/lib/require-creator'

// We test only the pure classification logic extracted from the guard.
// The actual redirect/createClient calls are tested via Playwright e2e.

describe('isCreatorRole', () => {
  it('returns true for admin', () => {
    expect(isCreatorRole('admin')).toBe(true)
  })
  it('returns true for author', () => {
    expect(isCreatorRole('author')).toBe(true)
  })
  it('returns false for user', () => {
    expect(isCreatorRole('user')).toBe(false)
  })
  it('returns false for null', () => {
    expect(isCreatorRole(null)).toBe(false)
  })
})
