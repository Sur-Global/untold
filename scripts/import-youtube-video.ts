/**
 * Import a video from SurGlobal's YouTube channel as published content authored by the SurGlobal profile
 * (created here the first time, with a placeholder bio to be corrected by hand).
 *
 * Takes the title, description (minus the "Síguenos en" footer), duration and cover from YouTube, keeps
 * YouTube's publish date, and skips videos that are already imported. Translation and transcript are
 * requested from the running site (NEXT_PUBLIC_SITE_URL), as the "Publish" button does.
 *
 * Run: npx tsx --env-file=.env.local scripts/import-youtube-video.ts <youtube-url> [--tags=futuros,tecnologia]
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { extractYouTubeId } from '../lib/youtube'
import { slugify } from '../lib/utils'
import { hostImage } from './lib/host-image'

const SURGLOBAL = {
  slug: 'surglobal',
  email: 'surglobal@authors.untold.ink',
  display_name: 'SurGlobal',
  bio:
    '<p>SurGlobal es una organización civil sin fines de lucro que busca ser un catalizador de innovación sostenible. ' +
    'Crea espacios de aprendizaje que cultivan el conocimiento, la inspiración y las conexiones humanas, elementos esenciales ' +
    'para una innovación responsable, y acompaña a personas y organizaciones con iniciativas brillantes para que sigan creciendo.</p>',
  website: 'https://surglobal.io/',
  social_instagram: 'https://www.instagram.com/surglobal_la/',
  social_custom_url: 'https://www.youtube.com/@surglobal-la',
  bio_cta_label: 'Conoce más sobre SurGlobal',
  bio_cta_url: 'https://surglobal.io/',
  avatar: 'https://yt3.ggpht.com/9kAf4wM6RHoX5F83aBLII_sdBodh1akDUf2jjgJUbcquEbG9yG8B0iAqaQ11tzpWtAWp9ZoX=s800-c-k-c0x00ffffff-no-rj',
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
}) as any

async function ensureSurGlobalProfile(): Promise<string> {
  const { data: existing } = await sb.from('profiles').select('id').eq('slug', SURGLOBAL.slug).maybeSingle()
  if (existing) return existing.id

  const { data: created, error } = await sb.auth.admin.createUser({
    email: SURGLOBAL.email,
    email_confirm: true,
    user_metadata: { display_name: SURGLOBAL.display_name },
  })
  if (error) throw new Error(`Could not create the SurGlobal user: ${error.message}`)
  const id: string = created.user.id

  const { avatar, ...fields } = SURGLOBAL
  const { error: profileError } = await sb
    .from('profiles')
    .upsert({ id, role: 'author', ...fields, avatar_url: await hostImage(avatar, 'avatar', id) }, { onConflict: 'id' })
  if (profileError) throw new Error(`Could not save the SurGlobal profile: ${profileError.message}`)
  console.log(`✓ Created profile SurGlobal [${SURGLOBAL.slug}]`)
  return id
}

/** "PT1H2M3S" → "1:02:03", "PT28M13S" → "28:13" */
function formatDuration(iso: string): string {
  const [, h = '0', m = '0', s = '0'] = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) ?? []
  const pad = (n: string) => n.padStart(2, '0')
  return +h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${+m}:${pad(s)}`
}

/** The channel's descriptions end with a "🔗 Síguenos en:" block of social handles: not part of the content. */
function descriptionParagraphs(description: string): string[] {
  return description
    .split(/\n[^\n]*S[ií]guenos en[\s\S]*$/i)[0]
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
}

const paragraphBlock = (text: string) => ({
  id: randomUUID(),
  type: 'paragraph',
  props: { textColor: 'default', textAlignment: 'left', backgroundColor: 'default' },
  content: [{ type: 'text', text, styles: {} }],
  children: [],
})

async function trigger(path: string, secretHeader: string, secret: string | undefined, contentId: string) {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', [secretHeader]: secret ?? '' },
      body: JSON.stringify({ contentId }),
    })
    console.log(`  ${res.ok ? '✓' : '✗'} ${path}: ${res.status}`)
  } catch {
    console.log(`  ✗ ${path}: ${process.env.NEXT_PUBLIC_SITE_URL} not reachable — start the site and run it again`)
  }
}

async function main() {
  const url = process.argv[2]
  const videoId = url && extractYouTubeId(url)
  if (!videoId) throw new Error('Usage: import-youtube-video.ts <youtube-url> [--tags=slug,slug]')
  const tagSlugs = (process.argv.find((a) => a.startsWith('--tags='))?.slice(7) ?? '').split(',').filter(Boolean)

  const embedUrl = `https://www.youtube.com/watch?v=${videoId}`
  const { data: dupes } = await sb.from('video_meta').select('content_id').ilike('embed_url', `%${videoId}%`)
  if (dupes?.length) {
    console.log(`Already imported (content ${dupes[0].content_id}) — nothing to do`)
    return
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
  )
  const item = (await res.json()).items?.[0]
  if (!item) throw new Error(`YouTube returned no video for ${videoId}`)
  const { snippet, contentDetails } = item
  const t = snippet.thumbnails
  const thumbnail: string = (t.maxres ?? t.standard ?? t.high ?? t.medium ?? t.default).url

  const authorId = await ensureSurGlobalProfile()
  const title: string = snippet.title.trim()
  const paragraphs = descriptionParagraphs(snippet.description ?? '')
  const cover = await hostImage(thumbnail, 'cover', authorId)
  const slug = `${slugify(title.normalize('NFKD').replace(/[̀-ͯ]/g, ''))}-${Date.now().toString(36)}`

  const { data: content, error } = await sb
    .from('content')
    .insert({
      type: 'video',
      author_id: authorId,
      slug,
      source_locale: 'es',
      status: 'published',
      // Service-role inserts skip the curation trigger, and only curated content shows in listings
      is_curated: true,
      published_at: snippet.publishedAt,
      cover_image_url: cover,
      declaration_accepted_at: new Date().toISOString(),
    })
    .select('id')
    .single()
  if (error) throw new Error(`Could not create the video: ${error.message}`)

  const steps = await Promise.all([
    sb.from('content_translations').insert({
      content_id: content.id,
      locale: 'es',
      title,
      description: paragraphs[0] ?? null,
      body: paragraphs.map(paragraphBlock),
    }),
    sb.from('video_meta').insert({
      content_id: content.id,
      embed_url: embedUrl,
      thumbnail_url: cover,
      duration: formatDuration(contentDetails.duration),
    }),
  ])
  for (const { error: e } of steps) if (e) throw new Error(e.message)

  if (tagSlugs.length) {
    const { data: tags } = await sb.from('tags').select('id, slug').in('slug', tagSlugs)
    const missing = tagSlugs.filter((s) => !tags?.some((tag: any) => tag.slug === s))
    if (missing.length) console.log(`  ! Unknown tags skipped: ${missing.join(', ')}`)
    if (tags?.length) await sb.from('content_tags').insert(tags.map((tag: any) => ({ content_id: content.id, tag_id: tag.id })))
  }

  console.log(`✓ "${title}" → /videos/${slug}`)
  await trigger('/api/translate', 'x-translate-secret', process.env.TRANSLATE_API_SECRET, content.id)
  await trigger('/api/transcript', 'x-transcript-secret', process.env.TRANSCRIPT_API_SECRET, content.id)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
