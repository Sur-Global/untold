/**
 * Visits every address the old Ghost site had (64 posts, 43 tags, the About page — written the way Ghost wrote them, with a
 * trailing slash) and checks that each one ends on the right page of this platform: status 200, at the expected address.
 * Shows how many redirects each one needed.
 *
 * Run: npx tsx scripts/check-old-urls.ts [base address, default https://www.untold.ink]
 */
import ghost from '../lib/ghost-redirects.json'

const base = (process.argv[2] ?? 'https://www.untold.ink').replace(/\/+$/, '')
const MAX_HOPS = 5

const expected: { from: string; to: string }[] = [
  ...ghost.posts.map((slug) => ({ from: `/${slug}/`, to: `/es/articles/${slug}` })),
  ...Object.entries(ghost.tags).map(([from, to]) => ({ from: `/tag/${from}/`, to: `/tag/${to}` })),
  ...ghost.tagsUnchanged.map((slug) => ({ from: `/tag/${slug}/`, to: `/tag/${slug}` })),
  ...ghost.pages.map((slug) => ({ from: `/${slug}/`, to: `/${slug}` })),
]

async function follow(path: string): Promise<{ status: number; hops: number; end: string; permanent: boolean }> {
  let url = base + path
  let permanent = true
  for (let hops = 0; hops <= MAX_HOPS; hops++) {
    const res = await fetch(url, { redirect: 'manual' })
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (res.status !== 301 && res.status !== 308) permanent = false
      url = new URL(res.headers.get('location')!, url).toString()
      continue
    }
    return { status: res.status, hops, end: new URL(url).pathname, permanent }
  }
  return { status: 0, hops: MAX_HOPS + 1, end: new URL(url).pathname, permanent }
}

async function main() {
  const results: { from: string; to: string; status: number; hops: number; end: string; permanent: boolean }[] = []
  for (let i = 0; i < expected.length; i += 6) {
    results.push(...(await Promise.all(expected.slice(i, i + 6).map(async (e) => ({ ...e, ...(await follow(e.from)) })))))
  }
  const wrong = results.filter((r) => r.status !== 200 || r.end !== r.to || !r.permanent)
  const byHops = results.reduce<Record<number, number>>((acc, r) => ({ ...acc, [r.hops]: (acc[r.hops] ?? 0) + 1 }), {})
  console.log(`${results.length} old addresses checked on ${base}; redirects needed (hops → addresses):`, byHops)
  for (const r of wrong) console.log(`✗ ${r.from} → ${r.end} (${r.status}${r.permanent ? '' : ', temporary redirect'}) expected ${r.to}`)
  if (wrong.length) process.exit(1)
  console.log('✓ every old address ends on its page, with permanent redirects')
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
