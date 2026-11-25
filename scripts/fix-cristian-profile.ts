import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const NEW_BIO = `Co-Director ejecutivo y Fundador de Sur Global, organización sin fines de lucro que impulsa innovación consciente en Latinoamérica. Magíster en Digital Management por Hyper Island. Con más de 10 años de experiencia en innovación, diseño digital y gestión de proyectos, ha trabajado en empresas, consultorías y formación. Fue Education & Product Manager en Crehana y Head of Product en Colectivo23, liderando proyectos educativos de impacto. Ha colaborado como consultor con UNICEF, Volvo, el Ministerio de Educación del Perú, Más Igualdad Perú, entre otros, siempre enfocado en el diseño, la tecnología y el trabajo colaborativo para transformar realidades. Además, es Director de Comunicaciones y Publicación de la revista UNTOLD.ink.`

async function main() {
  // ── 1. Find both profiles ──────────────────────────────────────────────────
  const { data: profiles, error: fetchErr } = await (sb as any)
    .from('profiles')
    .select('id, slug, display_name, bio')
    .in('slug', ['cristian-situ', 'cristian-situ-sanchez'])

  if (fetchErr) { console.error('Fetch error:', fetchErr); process.exit(1) }

  const primary   = profiles?.find((p: any) => p.slug === 'cristian-situ')
  const duplicate = profiles?.find((p: any) => p.slug === 'cristian-situ-sanchez')

  console.log('Primary profile:  ', primary   ? `${primary.display_name}   (${primary.id})` : 'NOT FOUND')
  console.log('Duplicate profile:', duplicate ? `${duplicate.display_name} (${duplicate.id})` : 'NOT FOUND')

  if (!primary) {
    console.error('Primary profile cristian-situ not found — aborting.')
    process.exit(1)
  }

  // ── 2. Update primary bio, clear stale translations ───────────────────────
  const { error: bioErr } = await (sb as any)
    .from('profiles')
    .update({ bio: NEW_BIO, profile_translations: {} })
    .eq('id', primary.id)

  if (bioErr) { console.error('Bio update error:', bioErr); process.exit(1) }
  console.log('✅ Bio updated for', primary.display_name)

  // ── 3. Reassign content from duplicate → primary ───────────────────────────
  if (duplicate) {
    const { data: moved, error: moveErr } = await (sb as any)
      .from('content')
      .update({ author_id: primary.id })
      .eq('author_id', duplicate.id)
      .select('slug, type')

    if (moveErr) { console.error('Content reassign error:', moveErr); process.exit(1) }
    console.log(`✅ Reassigned ${moved?.length ?? 0} content items from ${duplicate.display_name} → ${primary.display_name}:`)
    for (const item of moved ?? []) {
      console.log('   •', item.type, item.slug)
    }

    // ── 4. Delete the duplicate profile ────────────────────────────────────────
    // (safe now that no content references it)
    const { error: delErr } = await (sb as any)
      .from('profiles')
      .delete()
      .eq('id', duplicate.id)

    if (delErr) {
      console.warn('⚠️  Could not delete duplicate profile (may have other FK references):', delErr.message)
    } else {
      console.log('✅ Deleted duplicate profile:', duplicate.display_name)
    }
  } else {
    console.log('ℹ️  No cristian-situ-sanchez duplicate found — only bio was updated.')
  }

  console.log('\nDone.')
}

main()
