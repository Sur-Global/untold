import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

const MAX_BYTES = 10 * 1024 * 1024
const MAX_REDIRECTS = 3
const TIMEOUT_MS = 8000

/** True for addresses that must never be fetched from the server (loopback, private, link-local…). */
export function isPrivateAddress(address: string): boolean {
  const v = isIP(address)
  if (v === 4) {
    const [a, b] = address.split('.').map(Number)
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) ||
      a >= 224
    )
  }
  if (v === 6) {
    const lower = address.toLowerCase()
    if (lower === '::1' || lower === '::') return true
    if (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
    return mapped ? isPrivateAddress(mapped[1]) : false
  }
  return true // not an IP at all: treat as unsafe
}

export class ImageFetchError extends Error {}

async function assertPublicHttps(raw: string): Promise<URL> {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new ImageFetchError('That is not a valid link')
  }
  if (url.protocol !== 'https:') throw new ImageFetchError('Only https links are supported')
  if (url.username || url.password) throw new ImageFetchError('That link is not supported')
  const host = url.hostname.replace(/^\[|\]$/g, '')
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new ImageFetchError('That link is not supported')
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => [])
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new ImageFetchError('That link is not supported')
  }
  return url
}

/**
 * Downloads an image from a public https link (following a few redirects, each re-checked),
 * with a size cap and a timeout. Used to re-host photos creators paste as links.
 */
export async function fetchImageFromUrl(raw: string): Promise<Buffer> {
  let url = await assertPublicHttps(raw)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetch(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: { Accept: 'image/*', 'User-Agent': 'UNTOLD-image-import/1.0' },
      })

      if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
        url = await assertPublicHttps(new URL(res.headers.get('location')!, url).toString())
        continue
      }
      if (!res.ok) throw new ImageFetchError(`The image link answered with an error (${res.status})`)
      if (!(res.headers.get('content-type') ?? '').startsWith('image/')) {
        throw new ImageFetchError('That link is not a direct image (it must end in .jpg, .png, .webp…)')
      }
      const declared = Number(res.headers.get('content-length') ?? 0)
      if (declared > MAX_BYTES) throw new ImageFetchError('That image is too large (max 10 MB)')

      const reader = res.body?.getReader()
      if (!reader) throw new ImageFetchError('Could not read the image')
      const chunks: Uint8Array[] = []
      let total = 0
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.byteLength
        if (total > MAX_BYTES) {
          await reader.cancel()
          throw new ImageFetchError('That image is too large (max 10 MB)')
        }
        chunks.push(value)
      }
      return Buffer.concat(chunks)
    }
    throw new ImageFetchError('Too many redirects')
  } catch (err) {
    if (err instanceof ImageFetchError) throw err
    throw new ImageFetchError('Could not download that image')
  } finally {
    clearTimeout(timer)
  }
}
