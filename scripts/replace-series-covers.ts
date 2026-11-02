/**
 * Replaces the cover of the "Cartografías del Desvío" interviews with the new ones designed in Figma (frame "correcciones").
 * Mariana Alegre's interview already has the new cover and is never touched.
 *
 * Every cover is stored like the editor does it (WebP, 1200px wide, quality 80) under its own new file name — it never reuses or
 * overwrites a file, so no other article's picture can change. A backup of the old addresses is written before the first change.
 *
 * Run: npx tsx --env-file=.env.local scripts/replace-series-covers.ts <folder with the PNG files> <backup file.json> [--apply]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const MARIANA = 'c7a3ed10-772e-43c3-aced-b348c1b16cf6'

// file → article (slug and the name of its profile are checked before anything is written)
const COVERS: { file: string; id: string; slug: string; person: string }[] = [
  { file: 'chonon.png', id: '2b08e3f1-16c8-4cdb-a289-0d3e58c668a6', slug: 'cartografias-del-desvio-5', person: 'Chonon Bensho' },
  { file: 'mara.png', id: 'fa04aa04-9403-4711-b811-69ac955bab0e', slug: 'cartografias-del-desvio-mara', person: 'Mara Gourd-Mercado' },
  { file: 'zoila.png', id: 'e21ec895-60bb-48a9-baad-8ca285a56617', slug: 'cartografias-del-desvio-6', person: 'Zoila Ochoa Garay' },
  { file: 'eduardo.png', id: '4e6f429f-ac37-466f-a688-01723d932a51', slug: 'cartografias-del-desvio-eduardo-marisca-desde-el-sur', person: 'Eduardo Marisca' },
  { file: 'pablo.png', id: 'd8c4c8c0-2a9d-44b4-af28-c5ecd5f78261', slug: 'cartografias-del-desvio-2', person: 'Pablo Ruiz-Múzquiz' },
  { file: 'beatriz.png', id: 'ae5c7559-6cd4-4e7d-8dd9-bc41c17861d5', slug: 'cartografias-del-desvio-beatriz-ricci-desde-el-sur', person: 'Beatriz Ricci' },
  { file: 'lulo.png', id: 'ab702952-a842-4c42-bda2-14d24086d5d3', slug: 'cartografias-del-desvio', person: 'Luis (lulo) López' },
]

const [dir, backupFile] = process.argv.slice(2)
const apply = process.argv.includes('--apply')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })

async function main() {
  if (!dir || !backupFile) throw new Error('usage: replace-series-covers.ts <folder> <backup.json> [--apply]')
  if (COVERS.some((c) => c.id === MARIANA)) throw new Error("Mariana Alegre's cover must not be replaced")

  const { data: rows, error } = await sb
    .from('content')
    .select('id, slug, cover_image_url, author_id, profiles!content_author_id_fkey(display_name)')
    .in('id', COVERS.map((c) => c.id))
  if (error) throw new Error(error.message)

  // 1. every article exists and is the one we think it is
  const plan = COVERS.map((c) => {
    const row: any = rows?.find((r) => r.id === c.id)
    if (!row) throw new Error(`${c.slug}: article not found`)
    if (row.slug !== c.slug) throw new Error(`${c.id}: slug is "${row.slug}", expected "${c.slug}"`)
    if (row.profiles?.display_name !== c.person) throw new Error(`${c.slug}: profile is "${row.profiles?.display_name}", expected "${c.person}"`)
    return { ...c, row }
  })

  // 2. process every picture the way the editor does
  const processed = await Promise.all(
    plan.map(async (p) => ({ ...p, webp: await sharp(readFileSync(`${dir}/${p.file}`)).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer() })),
  )
  for (const p of processed) console.log(`${p.person.padEnd(22)} ${p.file.padEnd(12)} → ${(p.webp.length / 1024).toFixed(0)} KB   (now: ${String(p.row.cover_image_url).split('/').slice(-2).join('/')})`)
  if (!apply) return console.log('(dry run: nothing uploaded or changed)')

  // 3. backup, then upload under new names, check they answer, and only then repoint the articles
  writeFileSync(backupFile, JSON.stringify(processed.map((p) => ({ id: p.id, slug: p.slug, cover_image_url: p.row.cover_image_url })), null, 1))
  console.log('✓ backup written to', backupFile)

  const uploaded: { id: string; slug: string; url: string }[] = []
  for (const p of processed) {
    const path = `covers/${p.row.author_id}/${crypto.randomUUID()}.webp`
    const up = await sb.storage.from('content-images').upload(path, p.webp, { contentType: 'image/webp', upsert: false })
    if (up.error) throw new Error(`${p.slug}: upload failed: ${up.error.message}`)
    const url = sb.storage.from('content-images').getPublicUrl(path).data.publicUrl
    const head = await fetch(url, { method: 'HEAD' })
    if (!head.ok || !String(head.headers.get('content-type')).includes('image/webp')) throw new Error(`${p.slug}: ${url} does not answer as an image (${head.status})`)
    uploaded.push({ id: p.id, slug: p.slug, url })
    console.log('✓ uploaded', p.person)
  }
  for (const u of uploaded) {
    const { error: upErr } = await sb.from('content').update({ cover_image_url: u.url }).eq('id', u.id)
    if (upErr) throw new Error(`${u.slug}: ${upErr.message}`)
  }
  console.log(`✓ ${uploaded.length} covers replaced`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
