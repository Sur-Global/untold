import { describe, it, expect } from 'vitest'

describe('require-user module', () => {
  it('exports requireUser function', async () => {
    const mod = await import('@/lib/require-user')
    expect(typeof mod.requireUser).toBe('function')
  })
})
