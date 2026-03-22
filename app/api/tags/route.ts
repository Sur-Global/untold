import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json([], { status: 401 })

  const { data: tags } = await (supabase as any)
    .from('tags')
    .select('id, slug, names')
    .ilike('slug', `%${q.toLowerCase().replace(/\s+/g, '-')}%`)
    .limit(10)

  return NextResponse.json(
    (tags ?? []).map((t: any) => ({ id: t.id, slug: t.slug, name: t.names?.en ?? t.slug }))
  )
}
