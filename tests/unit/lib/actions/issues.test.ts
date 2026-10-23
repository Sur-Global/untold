import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/require-editor', () => ({ requireEditor: vi.fn().mockResolvedValue({ user: { id: 'u' }, profile: { role: 'admin' } }) }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/actions/activity-log', () => ({ logActivity: vi.fn() }))

import { saveIssue, deleteIssue } from '@/lib/actions/issues'
import { createClient } from '@/lib/supabase/server'

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Records every call made on each table
function makeDb(opts: { insertResult?: { data?: any; error?: any }; updateIssueError?: any } = {}) {
  const calls: { table: string; op: string; args: any[] }[] = []
  const from = vi.fn((table: string) => {
    const chain: any = {
      insert: vi.fn((row: any) => { calls.push({ table, op: 'insert', args: [row] }); return chain }),
      update: vi.fn((row: any) => { calls.push({ table, op: 'update', args: [row] }); return chain }),
      delete: vi.fn(() => { calls.push({ table, op: 'delete', args: [] }); return chain }),
      select: vi.fn(() => chain),
      single: vi.fn().mockResolvedValue(opts.insertResult ?? { data: { id: ID(99) }, error: null }),
      eq: vi.fn((col: string, val: any) => { calls.push({ table, op: 'eq', args: [col, val] }); return Object.assign(Promise.resolve({ error: table === 'issues' ? opts.updateIssueError ?? null : null }), chain) }),
      in: vi.fn((col: string, val: any) => { calls.push({ table, op: 'in', args: [col, val] }); return Promise.resolve({ error: null }) }),
      not: vi.fn((col: string, op: string, val: any) => { calls.push({ table, op: 'not', args: [col, op, val] }); return Promise.resolve({ error: null }) }),
    }
    return chain
  })
  vi.mocked(createClient).mockResolvedValue({ from } as any)
  return calls
}

const base = { number: 14, month: '2026-10', published: true, editorialId: ID(1), articleIds: [ID(2), ID(3)] }

describe('saveIssue', () => {
  beforeEach(() => vi.clearAllMocks())

  it('creates the issue, puts its articles (and the editorial) in it and marks the editorial', async () => {
    const calls = makeDb()
    const result = await saveIssue(base)
    expect(result).toEqual({ ok: true, id: ID(99) })
    const insert = calls.find((c) => c.table === 'issues' && c.op === 'insert')!
    expect(insert.args[0]).toEqual({ number: 14, issue_date: '2026-10-01', status: 'published', editorial_id: ID(1) })
    const assign = calls.filter((c) => c.table === 'content' && c.op === 'update')
    expect(assign.map((a) => a.args[0])).toContainEqual({ issue_id: ID(99) })
    expect(assign.map((a) => a.args[0])).toContainEqual({ is_editorial: true })
    const ids = calls.find((c) => c.table === 'content' && c.op === 'in' && c.args[0] === 'id')!
    expect(ids.args[1]).toEqual(expect.arrayContaining([ID(1), ID(2), ID(3)]))
  })

  it('takes out of the issue the articles that were unticked', async () => {
    const calls = makeDb()
    await saveIssue({ ...base, id: ID(50) })
    expect(calls.some((c) => c.table === 'issues' && c.op === 'update')).toBe(true)
    const release = calls.find((c) => c.op === 'not')!
    expect(release.args[0]).toBe('id')
    expect(release.args[2]).toContain(ID(2))
  })

  it('saves a draft with no editorial and no articles', async () => {
    const calls = makeDb()
    const result = await saveIssue({ number: 15, month: '2026-11', published: false, editorialId: null, articleIds: [] })
    expect(result.ok).toBe(true)
    expect(calls.find((c) => c.op === 'insert')!.args[0]).toMatchObject({ status: 'draft', editorial_id: null })
    expect(calls.some((c) => c.op === 'not')).toBe(false)
  })

  it('explains a duplicate issue number', async () => {
    makeDb({ insertResult: { data: null, error: { code: '23505', message: 'duplicate key' } } })
    expect(await saveIssue(base)).toEqual({ ok: false, error: 'Issue XIV of 2026 already exists.' })
  })

  it('rejects a bad number, month or article id before touching the database', async () => {
    const calls = makeDb()
    expect((await saveIssue({ ...base, number: 0 })).ok).toBe(false)
    expect((await saveIssue({ ...base, month: '' })).ok).toBe(false)
    expect((await saveIssue({ ...base, articleIds: ['not-an-id'] })).ok).toBe(false)
    expect(calls).toHaveLength(0)
  })
})

describe('deleteIssue', () => {
  it('deletes the issue (articles stay, just without an issue)', async () => {
    const calls = makeDb()
    expect(await deleteIssue(ID(5))).toEqual({ ok: true })
    expect(calls.find((c) => c.op === 'delete')?.table).toBe('issues')
  })
  it('refuses an invalid id', async () => {
    makeDb()
    expect((await deleteIssue('x')).ok).toBe(false)
  })
})
