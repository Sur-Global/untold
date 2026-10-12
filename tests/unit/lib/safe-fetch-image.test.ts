import { describe, it, expect } from 'vitest'
import { isPrivateAddress, fetchImageFromUrl, ImageFetchError } from '@/lib/safe-fetch-image'

describe('isPrivateAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1'])(
    'blocks %s',
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  )
  it.each(['8.8.8.8', '172.32.0.1', '151.101.1.69', '2606:4700:4700::1111'])('allows %s', (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  )
})

describe('fetchImageFromUrl refuses unsafe links before any request', () => {
  it.each([
    'not a url',
    'http://example.com/a.jpg',
    'https://localhost/a.jpg',
    'https://127.0.0.1/a.jpg',
    'https://169.254.169.254/latest/meta-data',
    'https://user:pass@example.com/a.jpg',
    'https://printer.local/a.jpg',
    'ftp://example.com/a.jpg',
  ])('%s', async (url) => {
    await expect(fetchImageFromUrl(url)).rejects.toBeInstanceOf(ImageFetchError)
  })
})
