import { createClient } from '@supabase/supabase-js'

const ELSIE_ID   = 'a8e8b051-dd04-45f8-a68e-8cc37ff1000a'
const CRISTIAN_ID = '1ee6e017-8ee9-464b-ba8f-aefca62dc966'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // ── Elsie: update email + set admin ───────────────────────────────────────
  const { error: e1 } = await sb.auth.admin.updateUserById(ELSIE_ID, {
    email: 'elsie@surglobal.io',
    email_confirm: true,
  })
  if (e1) console.error('Elsie email error:', e1.message)
  else console.log('✓ Elsie auth email → elsie@surglobal.io')

  const { error: e2 } = await (sb as any).from('profiles').update({ role: 'admin' }).eq('id', ELSIE_ID)
  if (e2) console.error('Elsie role error:', e2.message)
  else console.log('✓ Elsie role → admin')

  // ── Cristian: update email + set editor ───────────────────────────────────
  const { error: e3 } = await sb.auth.admin.updateUserById(CRISTIAN_ID, {
    email: 'cris@surglobal.io',
    email_confirm: true,
  })
  if (e3) console.error('Cris email error:', e3.message)
  else console.log('✓ Cristian auth email → cris@surglobal.io')

  const { error: e4 } = await (sb as any).from('profiles').update({ role: 'author' }).eq('id', CRISTIAN_ID)
  if (e4) console.error('Cris role error:', e4.message)
  else console.log('✓ Cristian role → editor')

  // ── Also set info@surglobal.io admin profile role for good measure ─────────
  const { error: e5 } = await (sb as any).from('profiles').update({ role: 'admin' }).eq('id', 'ebf4418c-5fff-43d9-bd8a-426a43226011')
  if (!e5) console.log('✓ info@surglobal.io → admin (kept)')

  console.log('\nDone. Elsie can now log in with elsie@surglobal.io, Cristian with cris@surglobal.io')
}

main().catch(console.error)
