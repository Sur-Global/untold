import { describe, it, expect } from 'vitest'
import { mergePlatformSettings } from '@/lib/platform-settings/defaults'

describe('latestSection setting ("Lo más reciente")', () => {
  it('is on with 4 articles by default', () => {
    expect(mergePlatformSettings(null).latestSection).toEqual({ enabled: true, count: 4 })
    expect(mergePlatformSettings({}).latestSection).toEqual({ enabled: true, count: 4 })
  })

  it('keeps 3, 4 or 5 and clamps anything else', () => {
    expect(mergePlatformSettings({ latestSection: { count: 5 } }).latestSection.count).toBe(5)
    expect(mergePlatformSettings({ latestSection: { count: 1 } }).latestSection.count).toBe(3)
    expect(mergePlatformSettings({ latestSection: { count: 99 } }).latestSection.count).toBe(5)
    expect(mergePlatformSettings({ latestSection: { count: 'x' } }).latestSection.count).toBe(4)
  })

  it('can be switched off', () => {
    expect(mergePlatformSettings({ latestSection: { enabled: false } }).latestSection.enabled).toBe(false)
  })
})
