import { describe, it, expect, vi } from 'vitest'
import { readDeclaration, recordDeclaration, requireDeclaration } from '@/lib/declaration'

function form(value?: string) {
  const fd = new FormData()
  if (value !== undefined) fd.set('responsibility_confirmed', value)
  return fd
}

// chainable fake: update().eq().is() and select().eq().single()
function fakeDb(accepted: string | null) {
  const updates: object[] = []
  const chain: any = {
    update: vi.fn((p: object) => { updates.push(p); return chain }),
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    is: vi.fn(() => chain),
    single: vi.fn(async () => ({ data: { declaration_accepted_at: accepted } })),
  }
  return { db: { from: vi.fn(() => chain) }, updates }
}

describe('readDeclaration', () => {
  it('is true only when the box was ticked', () => {
    expect(readDeclaration(form('true'))).toBe(true)
    expect(readDeclaration(form('false'))).toBe(false)
    expect(readDeclaration(form())).toBe(false)
  })
})

describe('recordDeclaration', () => {
  it('stamps the time only when ticked', async () => {
    const ticked = fakeDb(null)
    await recordDeclaration(ticked.db, 'c1', form('true'))
    expect(ticked.updates).toHaveLength(1)
    expect((ticked.updates[0] as any).declaration_accepted_at).toBeTruthy()

    const unticked = fakeDb(null)
    await recordDeclaration(unticked.db, 'c1', form('false'))
    expect(unticked.updates).toHaveLength(0)
  })
})

describe('requireDeclaration', () => {
  it('lets a publish through when the box is ticked now', async () => {
    await expect(requireDeclaration(fakeDb('2026-01-01').db, 'c1', form('true'))).resolves.toBeUndefined()
  })
  it('lets a publish through when it was confirmed earlier', async () => {
    await expect(requireDeclaration(fakeDb('2026-01-01').db, 'c1', form())).resolves.toBeUndefined()
  })
  it('refuses a publish that was never confirmed', async () => {
    await expect(requireDeclaration(fakeDb(null).db, 'c1', form())).rejects.toThrow('responsibility')
  })
})
