// Creates a carousel pill (as a DRAFT, never published) from a JSON file: the author, title, description, tags and the
// slides (texts and, for photo slides, the path of the picture). Photos are shrunk and stored in our own storage.
//
//   npx tsx scripts/import-carousel.ts path/to/carousel.json [--dry]
//
// {
//   "author": "Cristian Situ", "title": "…", "description": "…", "locale": "es",
//   "tags": [{ "slug": "decrecimiento", "names": { "es": "…", "en": "…", … } }],      // created if they do not exist
//   "slides": [{ "kind": "photo" | "text" | "image", "text": "…", "photo": "/path/photo.jpg", "text_x": "left", … }]
// }
import './lib/load-env'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { newSlide, parseSlides, firstSlideImage, slidesProblem, type PillSlide } from '../lib/pill-slides'
import { resolveLogoColors } from '../lib/slide-logo'
import { slugify } from '../lib/utils'

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
const dry = process.argv.includes('--dry')

type SlideSpec = Partial<PillSlide> & { photo?: string }
type Spec = { author: string; title: string; description?: string; locale?: string; tags?: { slug: string; names: Record<string, string> }[]; slides: SlideSpec[] }

async function uploadPhoto(file: string, ownerId: string): Promise<string> {
  const body = await sharp(readFileSync(file)).rotate().resize({ width: 1080, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
  const path = `covers/${ownerId}/${randomUUID()}.webp`
  const { error } = await sb.storage.from('content-images').upload(path, body, { contentType: 'image/webp', upsert: true })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  return sb.storage.from('content-images').getPublicUrl(path).data.publicUrl
}

async function main() {
  const specPath = process.argv[2]
  if (!specPath) throw new Error('Usage: npx tsx scripts/import-carousel.ts carousel.json [--dry]')
  const spec: Spec = JSON.parse(readFileSync(specPath, 'utf8'))
  const locale = spec.locale ?? 'es'

  const { data: author } = await sb.from('profiles').select('id, display_name, role, hidden').ilike('display_name', spec.author).maybeSingle()
  if (!author) throw new Error(`No profile called "${spec.author}"`)
  console.log(`Author: ${author.display_name} (${author.role})`)

  // slides: photos are uploaded, the rest of each slide goes through the same cleaning as the editor's
  const built: PillSlide[] = []
  for (const item of spec.slides) {
    const { photo, ...rest } = item
    const image_url = photo ? (dry ? 'https://example.invalid/photo.webp' : await uploadPhoto(resolve(dirname(specPath), photo), author.id)) : null
    built.push(...parseSlides([{ ...newSlide(item.kind ?? 'text'), ...rest, image_url }]))
  }
  const slides = dry ? built : await resolveLogoColors(built)
  const problem = slidesProblem(slides)
  if (problem) console.log(`(Not ready to publish yet: ${problem})`)
  console.log(`${slides.length} slides:`, slides.map((s) => `${s.kind}${s.brands.length ? '+' + s.brands.join('/') : ''}${s.logo_color ? ':' + s.logo_color : ''}`).join(' '))
  if (dry) return

  // tags (created in the six languages when new)
  const tagIds: string[] = []
  for (const tag of spec.tags ?? []) {
    const { data: found } = await sb.from('tags').select('id').eq('slug', tag.slug).maybeSingle()
    if (found) { tagIds.push(found.id); continue }
    const { data: created, error } = await sb.from('tags').insert({ slug: tag.slug, names: tag.names }).select('id').single()
    if (error || !created) throw new Error(`Could not create the tag ${tag.slug}: ${error?.message}`)
    tagIds.push(created.id)
    console.log(`Created tag ${tag.slug}`)
  }

  const cover = firstSlideImage(slides)
  const slug = `${slugify(spec.title.normalize('NFKD').replace(/[̀-ͯ]/g, ''))}-${Date.now().toString(36)}`
  const { data: content, error } = await sb
    .from('content')
    .insert({
      type: 'pill', author_id: author.id, slug, source_locale: locale, status: 'draft',
      // service-role inserts skip the curation trigger: curated like the content of an admin, editor or author
      is_curated: ['admin', 'editor', 'author'].includes(author.role),
      cover_image_url: cover,
    })
    .select('id')
    .single()
  if (error || !content) throw new Error(`Could not create the pill: ${error?.message}`)

  const steps = await Promise.all([
    sb.from('content_translations').insert({ content_id: content.id, locale, title: spec.title, excerpt: spec.description ?? null, body: [] }),
    sb.from('pill_meta').insert({ content_id: content.id, accent_color: '#A1A1E9', image_url: cover, format: 'carousel', slides }),
    tagIds.length ? sb.from('content_tags').insert(tagIds.map((tag_id) => ({ content_id: content.id, tag_id }))) : Promise.resolve({ error: null }),
  ])
  for (const { error: e } of steps) if (e) throw new Error(e.message)

  console.log(`✓ Draft created: /dashboard/pills/${content.id}/edit   (slug ${slug})`)
}

main().catch((err) => {
  console.error(err.message ?? err)
  process.exit(1)
})
