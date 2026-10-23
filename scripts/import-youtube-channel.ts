// Imports the videos of a YouTube channel as video content, skipping the ones already on the platform.
//   npx tsx scripts/import-youtube-channel.ts                 (dry run: lists what it would import)
//   APPLY=1 npx tsx scripts/import-youtube-channel.ts         (imports as drafts)
//   APPLY=1 STATUS=published npx tsx scripts/import-youtube-channel.ts
// Options (environment): UPLOADS (the channel's "uploads" playlist id, default SurGlobal's),
// AUTHOR_SLUG (profile the videos are attributed to, default surglobal), ONLY (comma-separated video ids).
// Uses YOUTUBE_API_KEY and the Supabase service role from .env.local.
import './lib/load-env'
import { createClient } from '@supabase/supabase-js'
import { cleanImportedTitle } from '../lib/clean-title'
import { cleanDescription, descriptionBlocks, formatDuration, parseChapters } from '../lib/youtube-import'
import { hostImage } from './lib/host-image'


const UPLOADS = process.env.UPLOADS ?? 'UUrl4F2H3PyZXmiF2UT4zj_w' // SurGlobal (@surglobal-la)
const AUTHOR_SLUG = process.env.AUTHOR_SLUG ?? 'surglobal'
const STATUS = process.env.STATUS === 'published' ? 'published' : 'draft'
const APPLY = process.env.APPLY === '1'
const ONLY = (process.env.ONLY ?? '').split(',').map((s) => s.trim()).filter(Boolean)
const KEY = process.env.YOUTUBE_API_KEY!
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

const api = async (path: string) => {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/${path}&key=${KEY}`)
  if (!res.ok) throw new Error(`YouTube API ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json() as Promise<any>
}

const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'video'

async function main() {
  const { data: author } = await sb.from('profiles').select('id').eq('slug', AUTHOR_SLUG).single()
  if (!author) throw new Error(`No profile with slug ${AUTHOR_SLUG}`)

  // every video of the channel, newest first
  const ids: string[] = []
  let token = ''
  do {
    const page = await api(`playlistItems?part=contentDetails&maxResults=50&playlistId=${UPLOADS}${token ? `&pageToken=${token}` : ''}`)
    ids.push(...page.items.map((i: any) => i.contentDetails.videoId))
    token = page.nextPageToken ?? ''
  } while (token)

  const { data: existing } = await sb.from('video_meta').select('embed_url')
  const have = new Set((existing ?? []).map((r: any) => /[?&]v=([\w-]{11})/.exec(r.embed_url ?? '')?.[1]).filter(Boolean))
  const wanted = ids.filter((id) => !have.has(id) && (ONLY.length === 0 || ONLY.includes(id)))
  console.log(`${ids.length} videos on the channel, ${ids.length - ids.filter((i) => !have.has(i)).length} already on the platform, ${wanted.length} to import as ${STATUS}${APPLY ? '' : ' (dry run)'}`)

  const details: any[] = []
  for (let n = 0; n < wanted.length; n += 50) details.push(...(await api(`videos?part=snippet,contentDetails&id=${wanted.slice(n, n + 50).join(',')}`)).items)
  details.sort((a, b) => a.snippet.publishedAt.localeCompare(b.snippet.publishedAt)) // oldest first, so the newest ends up newest

  let created = 0
  for (const v of details) {
    const s = v.snippet
    const title = cleanImportedTitle(s.title)
    const description = cleanDescription(s.description ?? '')
    const chapters = parseChapters(description)
    const duration = formatDuration(v.contentDetails.duration)
    console.log(`${APPLY ? '+' : '·'} ${s.publishedAt.slice(0, 10)}  ${duration.padStart(7)}  ${title}${chapters.length ? `  [${chapters.length} chapters]` : ''}`)
    if (!APPLY) continue

    const thumb = s.thumbnails.maxres?.url ?? s.thumbnails.standard?.url ?? s.thumbnails.high?.url
    const cover = await hostImage(thumb, 'cover', author.id)
    const { data: content, error } = await sb
      .from('content')
      .insert({
        type: 'video',
        author_id: author.id,
        slug: `${slugify(title)}-${Date.now().toString(36)}`,
        source_locale: 'es',
        single_language: true,
        subtitle_locales: ['en', 'pt', 'fr'],
        status: STATUS,
        published_at: s.publishedAt,
        cover_image_url: cover,
        declaration_accepted_at: new Date().toISOString(),
        is_curated: true,
      })
      .select('id')
      .single()
    if (error || !content) throw new Error(`content insert failed for ${v.id}: ${error?.message}`)
    const { error: e2 } = await sb.from('content_translations').insert({
      content_id: content.id, locale: 'es', title, description, excerpt: null, body: descriptionBlocks(description, chapters.length),
    })
    if (e2) throw new Error(`translation insert failed for ${v.id}: ${e2.message}`)
    const { error: e3 } = await sb.from('video_meta').insert({
      content_id: content.id, embed_url: `https://www.youtube.com/watch?v=${v.id}`, thumbnail_url: cover, duration,
      chapters, transcript: null, layout_style: 'standard', show_transcript: false,
    })
    if (e3) throw new Error(`video_meta insert failed for ${v.id}: ${e3.message}`)
    created++
  }
  console.log(APPLY ? `Imported ${created} videos as ${STATUS}.` : 'Dry run only: run again with APPLY=1 to import.')
}

if (require.main === module) main().catch((e) => { console.error(e); process.exit(1) })
