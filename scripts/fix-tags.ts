/**
 * Comprehensive tag cleanup + enrichment script.
 *
 * 1. Normalises existing tags:
 *    – Adds `en` translations to every tag
 *    – Merges duplicate/English tags into canonical Spanish tags:
 *        futures     → futuros
 *        tech        → tecnologia
 *        ai          → inteligencia-artificial (slug rename)
 *        research    → investigacion           (slug rename)
 *        behaviorual-design → diseno-conductual (slug rename + typo fix)
 *
 * 2. Adds missing but relevant tags to articles based on their content.
 *
 * 3. Creates a handful of new tags needed for proper coverage.
 *
 * Run: npx tsx --env-file=.env.local scripts/fix-tags.ts
 */

import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// ─── Canonical tag definitions ────────────────────────────────────────────────
// Each entry: [slug, { es, en }]
// Tags that already exist will be updated; new ones created.

const CANONICAL_TAGS: Array<[string, { es: string; en: string }]> = [
  ['accesibilidad',            { es: 'accesibilidad',               en: 'accessibility' }],
  ['inteligencia-artificial',  { es: 'inteligencia artificial',      en: 'artificial intelligence' }],
  ['arte',                     { es: 'arte',                         en: 'art' }],
  ['autocuidado',              { es: 'autocuidado',                  en: 'self-care' }],
  ['diseno-conductual',        { es: 'diseño conductual',            en: 'behavioral design' }],
  ['bienestar-publico',        { es: 'bienestar público',            en: 'public wellbeing' }],
  ['cambio-climatico',         { es: 'cambio climático',             en: 'climate change' }],
  ['ciudadania',               { es: 'ciudadanía',                   en: 'citizenship' }],
  ['cultura',                  { es: 'cultura',                      en: 'culture' }],
  ['decolonizacion',           { es: 'decolonización',               en: 'decolonization' }],
  ['democracia',               { es: 'democracia',                   en: 'democracy' }],
  ['derechos-humanos',         { es: 'derechos humanos',             en: 'human rights' }],
  ['diseno',                   { es: 'diseño',                       en: 'design' }],
  ['ecologia',                 { es: 'ecología',                     en: 'ecology' }],
  ['educacion',                { es: 'educación',                    en: 'education' }],
  ['entrevista',               { es: 'entrevista',                   en: 'interview' }],
  ['etnologia',                { es: 'etnología',                    en: 'ethnology' }],
  ['feminismo',                { es: 'feminismo',                    en: 'feminism' }],
  ['futuros',                  { es: 'futuros',                      en: 'futures' }],
  ['habilidades-para-el-futuro', { es: 'habilidades para el futuro', en: 'future skills' }],
  ['identidad',                { es: 'identidad',                    en: 'identity' }],
  ['innovacion',               { es: 'innovación',                   en: 'innovation' }],
  ['internet',                 { es: 'internet',                     en: 'internet' }],
  ['investigacion',            { es: 'investigación',                en: 'research' }],
  ['libros',                   { es: 'libros',                       en: 'books' }],
  ['migracion',                { es: 'migración',                    en: 'migration' }],
  ['salud',                    { es: 'salud',                        en: 'health' }],
  ['soberania',                { es: 'soberanía',                    en: 'sovereignty' }],
  ['sostenibilidad',           { es: 'sostenibilidad',               en: 'sustainability' }],
  ['stem',                     { es: 'STEM',                         en: 'STEM' }],
  ['tecnologia',               { es: 'tecnología',                   en: 'technology' }],
]

// Tags to delete after migrating their articles to a canonical tag
// [old_slug, canonical_slug]
const MERGE_MAP: Array<[string, string]> = [
  ['futures',           'futuros'],
  ['tech',              'tecnologia'],
  ['ai',                'inteligencia-artificial'],
  ['research',          'investigacion'],
  ['behaviorual-design','diseno-conductual'],
]

// ─── Article → additional tags to assign ──────────────────────────────────────
// Only tags that are NOT already assigned. The script is idempotent.
// Format: [article_slug, [tag_slugs_to_add]]

const ARTICLE_EXTRA_TAGS: Array<[string, string[]]> = [
  // AI / technology articles
  ['mas-alla-del-algoritmo-dominante-resistencia-y-soberania-digital-en-el-sur',
    ['decolonizacion', 'tecnologia', 'internet']],
  ['reclamar-la-red-hacia-un-internet-post-ingenuo-y-pluriversal',
    ['soberania', 'decolonizacion', 'tecnologia']],
  ['artistas-ia-entre-el-plagio-y-la-direccion-de-arte',
    ['diseno', 'tecnologia']],
  ['reescribiendo-el-futuro-de-ai-2027-donde-queda-america-latina',
    ['tecnologia', 'decolonizacion']],
  ['disenar-en-la-incertidumbre-cuando-el-diseno-se-vuelve-brujula',
    ['futuros', 'innovacion']],
  ['deberiamos-usar-chat-gpt-en-el-sur-global',
    ['educacion', 'decolonizacion', 'tecnologia']],
  ['elecciones-algoritmicas',
    ['tecnologia', 'inteligencia-artificial']],
  ['si-es-gratis-tu-eres-el-producto',
    ['soberania', 'inteligencia-artificial']],
  ['tecnologia-sin-universales',
    ['soberania', 'derechos-humanos']],
  ['cartografias-del-desvio-4',
    ['futuros', 'diseno']],
  ['edad-pobreza-y-tecnologia-un-estudio-de-caso-sobre-la-brecha-digital',
    ['accesibilidad', 'tecnologia', 'derechos-humanos']],

  // Futures / speculative design
  ['disenar-futuros-desde-el-sur',
    ['futuros', 'decolonizacion', 'soberania']],
  ['cartografias-del-desvio',
    ['arte', 'futuros']],
  ['cartografias-del-desvio-beatriz-ricci-desde-el-sur',
    ['decolonizacion', 'arte']],
  ['cartografias-del-desvio-eduardo-marisca-desde-el-sur',
    ['tecnologia', 'decolonizacion']],
  ['la-construccion-estrategica-de-futuros-exige-combatir-la-inmediatez',
    ['innovacion', 'habilidades-para-el-futuro']],
  ['como-predecir-el-futuro-sin-una-bola-de-cristal-2',
    ['innovacion', 'habilidades-para-el-futuro']],
  ['el-ritual-sagrado-del-mas-aca-rituales-especulativos-para-habitar-el-intermedio',
    ['arte', 'diseno']],
  ['los-espejismos-del-autocuidado-cuidarnos-para-poder-imaginar-futuros-posibles',
    ['futuros', 'salud']],
  ['disenando-el-futuro-paso-a-paso',
    ['diseno', 'habilidades-para-el-futuro']],
  ['i-wanna-be-soil',
    ['futuros', 'sostenibilidad', 'arte']],
  ['semillas-de-futuro-transformando-los-sistemas-de-investigacion-en-america-latina-y-el-caribe',
    ['educacion', 'decolonizacion']],
  ['seis-libros-para-reinventar-el-mundo-incomodos-inspiradores-y-necesarios',
    ['cultura', 'libros']],
  ['y-ahora-como-innovamos',
    ['futuros', 'cultura']],

  // Design
  ['desde-el-barrio-se-disena-distinto',
    ['cultura']],
  ['ni-mi-dinero-ni-mi-empleo-ni-yo-dei-en-retirada',
    ['cultura', 'innovacion']],
  ['sostener-lo-que-parece-opuesto-una-invitacion-a-mirar-distinto',
    ['futuros', 'habilidades-para-el-futuro']],
  ['habitar-la-imagen',
    ['arte', 'diseno']],

  // Culture / society
  ['la-sociedad-del-cansancio',
    ['cultura', 'salud']],
  ['cantagallo-donde-la-selva-resiste-en-el-corazon-de-lima',
    ['decolonizacion', 'ecologia', 'derechos-humanos']],
  ['salud-mental-en-el-trabajo-deudas-pendientes',
    ['bienestar-publico', 'autocuidado']],
  ['la-deuda-eterna-con-la-educacion-rural-en-peru',
    ['decolonizacion']],
  ['liderazgosostenible',
    ['futuros', 'innovacion']],
  ['soberania-cultural-una-guia-para-sobrevivir-al-siglo-xxi',
    ['cultura', 'identidad']],
  ['tu-trabajo-no-necesita-mas-keynotes',
    ['cultura', 'innovacion']],
  ['el-pensamiento-binario-y-como-limita-el-desarrollo',
    ['cultura', 'futuros']],
  ['cartografias-gonzalobenaventes',
    ['diseno', 'identidad']],
  ['cartografias-del-desvio-paulazoccotti',
    ['cultura', 'identidad']],

  // Climate / ecology
  ['desde-el-ombligo-lecciones-ancestrales-para-un-manana-mejor',
    ['decolonizacion', 'futuros', 'ecologia']],
  ['no-se-trata-de-paneles-solares-se-trata-de-mujeres',
    ['feminismo', 'decolonizacion']],
  ['educacion-climatica',
    ['educacion']],
  ['entre-el-excel-y-el-instinto',
    ['innovacion', 'habilidades-para-el-futuro']],

  // Feminism / gender / migration
  ['resistir-es-acuerpar',
    ['derechos-humanos', 'decolonizacion']],
  ['acuerpamiento-de-feministas-migrantas-cuando-el-suelo-es-ajeno-urge-el-enraizamiento-entre-cuerpos-territorios',
    ['feminismo', 'decolonizacion', 'identidad', 'migracion']],

  // Education / skills
  ['el-futuro-stem-es-conductual',
    ['educacion', 'futuros', 'habilidades-para-el-futuro']],
  ['el-estado-te-emplea-no-te-forma',
    ['educacion', 'derechos-humanos']],
  ['cartografias-del-desvio-3',
    ['arte', 'decolonizacion']],
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getTagIdBySlug(slug: string): Promise<string | null> {
  const { data } = await (sb as any).from('tags').select('id').eq('slug', slug).maybeSingle()
  return data?.id ?? null
}

async function getOrCreateTag(slug: string, names: { es: string; en: string }): Promise<string> {
  const existing = await getTagIdBySlug(slug)
  if (existing) {
    await (sb as any).from('tags').update({ names }).eq('id', existing)
    return existing
  }
  const { data, error } = await (sb as any).from('tags').insert({ slug, names }).select('id').single()
  if (error) throw new Error(`Failed to create tag [${slug}]: ${error.message}`)
  return data.id
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── Step 1: Upsert all canonical tags ───────────────────────────────────────
  console.log('\n▶  Step 1: Upserting canonical tags...')
  const tagIdBySlug = new Map<string, string>()
  for (const [slug, names] of CANONICAL_TAGS) {
    const id = await getOrCreateTag(slug, names)
    tagIdBySlug.set(slug, id)
    console.log(`   ✓ [${slug}]`)
  }

  // ── Step 2: Merge old tags into canonical ones ───────────────────────────────
  console.log('\n▶  Step 2: Merging deprecated tags...')
  for (const [oldSlug, newSlug] of MERGE_MAP) {
    const oldId = await getTagIdBySlug(oldSlug)
    if (!oldId) { console.log(`   – [${oldSlug}] not found, skipping`); continue }
    const newId = tagIdBySlug.get(newSlug)
    if (!newId) { console.log(`   ✗ [${newSlug}] canonical not found!`); continue }

    // Find articles currently tagged with oldSlug
    const { data: rows } = await (sb as any)
      .from('content_tags')
      .select('content_id')
      .eq('tag_id', oldId)

    let moved = 0
    for (const row of rows ?? []) {
      // Check if new tag already applied to avoid duplicate PK
      const { data: exists } = await (sb as any)
        .from('content_tags')
        .select('content_id')
        .eq('content_id', row.content_id)
        .eq('tag_id', newId)
        .maybeSingle()

      if (!exists) {
        await (sb as any).from('content_tags').insert({ content_id: row.content_id, tag_id: newId })
        moved++
      }
    }

    // Delete all old content_tags and the old tag
    await (sb as any).from('content_tags').delete().eq('tag_id', oldId)
    await (sb as any).from('tags').delete().eq('id', oldId)
    console.log(`   ✓ [${oldSlug}] → [${newSlug}]  (${moved} articles migrated)`)
  }

  // ── Step 3: Assign extra tags to articles ────────────────────────────────────
  console.log('\n▶  Step 3: Adding extra tags to articles...')
  let addedCount = 0

  for (const [articleSlug, tagSlugs] of ARTICLE_EXTRA_TAGS) {
    // Get content id
    const { data: content } = await (sb as any)
      .from('content')
      .select('id')
      .eq('slug', articleSlug)
      .eq('type', 'article')
      .maybeSingle()

    if (!content) {
      console.log(`   ⚠  Article not found: ${articleSlug}`)
      continue
    }

    for (const tagSlug of tagSlugs) {
      const tagId = tagIdBySlug.get(tagSlug)
      if (!tagId) { console.log(`   ✗  Unknown tag slug: ${tagSlug}`); continue }

      // Only insert if not already present
      const { data: exists } = await (sb as any)
        .from('content_tags')
        .select('content_id')
        .eq('content_id', content.id)
        .eq('tag_id', tagId)
        .maybeSingle()

      if (!exists) {
        const { error } = await (sb as any)
          .from('content_tags')
          .insert({ content_id: content.id, tag_id: tagId })
        if (error) {
          console.log(`   ✗  ${articleSlug} ← [${tagSlug}]: ${error.message}`)
        } else {
          addedCount++
        }
      }
    }
    console.log(`   ✓  ${articleSlug}`)
  }

  console.log(`\n✅  Done! Tags normalised. ${addedCount} new article-tag links added.`)
}

main().catch(err => { console.error(err); process.exit(1) })
