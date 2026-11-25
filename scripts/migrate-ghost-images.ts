/**
 * Copies every image that still lives on Ghost (storage.ghost.io / untoldmag.ghost.io) into the platform's own storage and
 * points the database at the copies: article covers, images inside articles (every language), and profile photos.
 *
 *   step 1  --host   downloads each image, stores it (same rules as the editor's uploads: WebP up to 1200 px, portraits 512×512,
 *                    animated GIFs kept as they are) and writes the map  old address → new address.  Changes nothing in the database.
 *   step 2  --apply  checks that every new address answers, saves a backup of every row it will touch, then replaces the addresses.
 *
 * Run: npx tsx --env-file=.env.local scripts/migrate-ghost-images.ts <folder> --host
 *      npx tsx --env-file=.env.local scripts/migrate-ghost-images.ts <folder> --apply
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const dir = process.argv[2]
const HOST_RE = /^https?:\/\/(?:[a-z0-9-]+\.)*ghost\.io\//i
const MAP_FILE = `${dir}/map.json`

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const isGhost = (u: unknown): u is string => typeof u === 'string' && HOST_RE.test(u)

/** every Ghost address inside any JSON value, found at any depth */
function collect(node: any, into: Set<string>) {
  if (typeof node === 'string') { if (isGhost(node)) into.add(node) }
  else if (Array.isArray(node)) node.forEach((n) => collect(n, into))
  else if (node && typeof node === 'object') Object.values(node).forEach((n) => collect(n, into))
}
function replaceIn(node: any, map: Record<string, string>): any {
  if (typeof node === 'string') return map[node] ?? node
  if (Array.isArray(node)) return node.map((n) => replaceIn(n, map))
  if (node && typeof node === 'object') return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, replaceIn(v, map)]))
  return node
}

async function allRows(table: string, columns: string) {
  const out: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from(table).select(columns).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return out
}

async function download(url: string): Promise<Buffer> {
  let last: unknown
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    } catch (e) { last = e; await new Promise((r) => setTimeout(r, 800 * (attempt + 1))) }
  }
  throw last
}

async function host() {
  const profiles = await allRows('profiles', 'id, avatar_url')
  const covers = await allRows('content', 'id, cover_image_url')
  const bodies = await allRows('content_translations', 'id, body')

  // portraits: one file per profile (stored under that profile's own id)
  const avatarJobs = profiles.filter((p) => isGhost(p.avatar_url)).map((p) => ({ profileId: p.id as string, url: p.avatar_url as string }))
  const inline = new Set<string>()
  covers.forEach((c) => isGhost(c.cover_image_url) && inline.add(c.cover_image_url))
  bodies.forEach((b) => collect(b.body, inline))

  const map: Record<string, string> = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, 'utf8')) : {}
  const failed: { url: string; why: string }[] = []
  const content = sb.storage.from('content-images')

  const queue = [...inline].filter((u) => !map[u])
  console.log(`${inline.size} images in covers and articles (${queue.length} still to copy), ${avatarJobs.length} profile photos`)

  async function worker() {
    for (let url = queue.pop(); url; url = queue.pop()) {
      try {
        const input = await download(url)
        const meta = await sharp(input).metadata()
        const animated = meta.format === 'gif' && (meta.pages ?? 1) > 1
        const body = animated ? input : await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
        const path = `inline/ghost-migration/${randomUUID()}.${animated ? 'gif' : 'webp'}`
        const { error } = await content.upload(path, body, { contentType: animated ? 'image/gif' : 'image/webp', upsert: false })
        if (error) throw new Error(error.message)
        map[url] = content.getPublicUrl(path).data.publicUrl
      } catch (e) { failed.push({ url, why: e instanceof Error ? e.message : String(e) }) }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker))

  for (const job of avatarJobs) {
    const key = `avatar:${job.profileId}`
    if (map[key]) continue
    try {
      const body = await sharp(await download(job.url)).rotate().resize(512, 512, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 80 }).toBuffer()
      const { error } = await sb.storage.from('avatars').upload(`${job.profileId}.webp`, body, { contentType: 'image/webp', upsert: true })
      if (error) throw new Error(error.message)
      map[key] = `${sb.storage.from('avatars').getPublicUrl(`${job.profileId}.webp`).data.publicUrl}?v=${Date.now()}`
    } catch (e) { failed.push({ url: job.url, why: e instanceof Error ? e.message : String(e) }) }
  }

  writeFileSync(MAP_FILE, JSON.stringify(map, null, 1))
  writeFileSync(`${dir}/failed.json`, JSON.stringify(failed, null, 1))
  console.log(`✓ copied ${Object.keys(map).length} images · failed ${failed.length}`, failed.slice(0, 5))
}

async function apply() {
  const map: Record<string, string> = JSON.parse(readFileSync(MAP_FILE, 'utf8'))
  // 1. every new address must answer before anything is changed
  const targets = [...new Set(Object.values(map))]
  const bad: string[] = []
  for (let i = 0; i < targets.length; i += 10) {
    await Promise.all(targets.slice(i, i + 10).map(async (u) => {
      const r = await fetch(u, { method: 'HEAD' }).catch(() => null)
      if (!r || !r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) bad.push(u)
    }))
  }
  if (bad.length) throw new Error(`${bad.length} new addresses do not answer as images; nothing changed: ${bad.slice(0, 3).join(' ')}`)
  console.log(`✓ the ${targets.length} new addresses answer`)

  const backup: Record<string, any[]> = { profiles: [], content: [], content_translations: [] }
  const changed = { profiles: 0, content: 0, content_translations: 0 }

  for (const p of await allRows('profiles', 'id, avatar_url')) {
    const next = map[`avatar:${p.id}`]
    if (isGhost(p.avatar_url) && next) {
      backup.profiles.push(p)
      const { error } = await sb.from('profiles').update({ avatar_url: next }).eq('id', p.id)
      if (error) throw new Error(`profile ${p.id}: ${error.message}`)
      changed.profiles++
    }
  }
  for (const c of await allRows('content', 'id, cover_image_url')) {
    if (isGhost(c.cover_image_url) && map[c.cover_image_url]) {
      backup.content.push(c)
      const { error } = await sb.from('content').update({ cover_image_url: map[c.cover_image_url] }).eq('id', c.id)
      if (error) throw new Error(`content ${c.id}: ${error.message}`)
      changed.content++
    }
  }
  for (const t of await allRows('content_translations', 'id, body')) {
    const found = new Set<string>()
    collect(t.body, found)
    if ([...found].some((u) => map[u])) {
      backup.content_translations.push(t)
      const { error } = await sb.from('content_translations').update({ body: replaceIn(t.body, map) }).eq('id', t.id)
      if (error) throw new Error(`translation ${t.id}: ${error.message}`)
      changed.content_translations++
    }
  }
  writeFileSync(`${dir}/backup-before-apply.json`, JSON.stringify(backup))
  console.log('✓ database updated', changed)
}

const mode = process.argv.includes('--apply') ? apply : process.argv.includes('--host') ? host : null
if (!mode) { console.error('use --host or --apply'); process.exit(1) }
mode().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
