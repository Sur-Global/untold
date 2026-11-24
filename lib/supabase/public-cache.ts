import { revalidateTag } from 'next/cache'

/**
 * Remembering database answers for visitors who are not signed in.
 *
 * Why: without this, every page view (readers and search-engine bots alike) asked Supabase again for
 * everything on the page, about 21,000 requests a day, which went over the free plan's 5 GB a month of
 * data sent out (egress). Visitors who are not signed in all see the same published content, so one
 * answer can serve all of them for a few minutes.
 *
 * - Only reads (GET) of the database API (/rest/v1/) by visitors WITHOUT a session are remembered.
 *   Signed-in people (editors, authors, readers with an account) always get live data.
 * - Anything saved through the server (server actions, API routes) clears the remembered answers, so a
 *   published change shows for everyone on the next visit. Saves made straight from the browser show
 *   within PUBLIC_CACHE_SECONDS at most.
 */

export const PUBLIC_CACHE_TAG = 'public-data'
export const PUBLIC_CACHE_SECONDS = 300

const WRITE_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE'])

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  if (init?.method) return init.method.toUpperCase()
  if (typeof input === 'object' && 'method' in input) return input.method.toUpperCase()
  return 'GET'
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

/** True for a write to a table (not a stored function call: those are mostly reads, like counters and searches). */
function isTableWrite(method: string, url: string): boolean {
  return WRITE_METHODS.has(method) && url.includes('/rest/v1/') && !url.includes('/rest/v1/rpc/')
}

/** Clear the remembered public answers. Only possible while saving (server action / API route); during a page render it is skipped. */
export function clearPublicCache() {
  try {
    revalidateTag(PUBLIC_CACHE_TAG, { expire: 0 })
  } catch {
    // Called while drawing a page (not allowed there): the answers expire on their own within PUBLIC_CACHE_SECONDS.
  }
}

/** fetch for a visitor without a session: database reads are remembered; writes clear what was remembered. */
export const publicCachedFetch: typeof fetch = async (input, init) => {
  const method = methodOf(input, init)
  const url = urlOf(input)
  if (method === 'GET' && url.includes('/rest/v1/')) {
    return fetch(input, { ...init, next:{ revalidate: PUBLIC_CACHE_SECONDS, tags: [PUBLIC_CACHE_TAG] } })
  }
  const res = await fetch(input, init)
  if (res.ok && isTableWrite(method, url)) clearPublicCache()
  return res
}

/** fetch for signed-in people and the service-role client: never remembered, but a successful save clears the public answers. */
export const liveFetchClearingCache: typeof fetch = async (input, init) => {
  const res = await fetch(input, init)
  if (res.ok && isTableWrite(methodOf(input, init), urlOf(input))) clearPublicCache()
  return res
}
