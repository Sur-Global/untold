import { describe, it, expect } from 'vitest'
import { canEditContent } from '@/lib/can-edit-content'

describe('canEditContent (who sees the Edit button on a content page)', () => {
  it('admins and editors see it on anything', () => {
    expect(canEditContent({ userId: 'u1', role: 'admin', authorId: 'someone-else' })).toBe(true)
    expect(canEditContent({ userId: 'u1', role: 'editor', authorId: 'someone-else' })).toBe(true)
  })
  it('the author sees it on their own content', () => {
    expect(canEditContent({ userId: 'u1', role: 'author', authorId: 'u1' })).toBe(true)
    expect(canEditContent({ userId: 'u1', role: 'user', authorId: 'u1' })).toBe(true)
  })
  it('nobody else does, and visitors who are not signed in never do', () => {
    expect(canEditContent({ userId: 'u1', role: 'author', authorId: 'u2' })).toBe(false)
    expect(canEditContent({ userId: null, role: null, authorId: 'u2' })).toBe(false)
    expect(canEditContent({ userId: 'u1', role: 'user', authorId: null })).toBe(false)
  })
})
