import { describe, it, expect } from 'vitest'
import { resolveAuthorId, requestedAuthorId } from '@/lib/resolve-author'

const OTHER = '11111111-1111-4111-8111-111111111111'
const ME = '22222222-2222-4222-8222-222222222222'

function db(existing: string[]) {
  return {
    from: () => ({
      select: () => ({
        eq: (_c: string, v: string) => ({
          maybeSingle: async () => ({ data: existing.includes(v) ? { id: v } : null }),
        }),
      }),
    }),
  }
}
const fd = (id?: string) => { const f = new FormData(); if (id) f.set('author_id', id); return f }

describe('resolveAuthorId', () => {
  it('lets an editor attribute content to an existing author', async () => {
    expect(await resolveAuthorId(db([OTHER]), fd(OTHER), { id: ME }, 'editor')).toBe(OTHER)
  })
  it('ignores author_id from regular authors', async () => {
    expect(await resolveAuthorId(db([OTHER]), fd(OTHER), { id: ME }, 'author')).toBe(ME)
  })
  it('falls back to the current user when missing, invalid or unknown', async () => {
    expect(await resolveAuthorId(db([OTHER]), fd(), { id: ME }, 'admin')).toBe(ME)
    expect(await resolveAuthorId(db([OTHER]), fd('not-a-uuid'), { id: ME }, 'admin')).toBe(ME)
    expect(await resolveAuthorId(db([]), fd(OTHER), { id: ME }, 'admin')).toBe(ME)
  })
})

describe('requestedAuthorId (edit path)', () => {
  it('returns null when no change was requested, so the author is left alone', async () => {
    expect(await requestedAuthorId(db([OTHER]), fd(), 'editor')).toBeNull()
  })
})
