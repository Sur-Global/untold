import { createClient } from '@supabase/supabase-js'

async function main() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  for (const email of ['elsie@surglobal.io', 'cris@surglobal.io']) {
    const { data, error } = await sb.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: 'http://localhost:3000/es/dashboard' },
    })
    if (error) console.error(`${email} error:`, error.message)
    else console.log(`\n${email}:\n${data.properties?.action_link}`)
  }
}

main().catch(console.error)
