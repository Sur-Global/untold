import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isEditorRole } from '@/lib/require-editor'

// What the signed-in user may do in the content editors (so the UI only offers what will work)
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ canUploadVideo: false })

  const { data: profile } = await (supabase as any).from('profiles').select('role').eq('id', user.id).single()
  return NextResponse.json({ canUploadVideo: isEditorRole(profile?.role) })
}
