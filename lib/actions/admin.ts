'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireAdmin } from '@/lib/require-admin'

export async function toggleFeatured(contentId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: item } = await (supabase as any)
    .from('content')
    .select('is_featured')
    .eq('id', contentId)
    .single()

  await (supabase as any)
    .from('content')
    .update({ is_featured: !item?.is_featured })
    .eq('id', contentId)

  revalidatePath('/admin/content')
}

export async function adminUnpublishContent(contentId: string) {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('content')
    .update({ status: 'draft', published_at: null, is_featured: false })
    .eq('id', contentId)

  revalidatePath('/admin/content')
}

export async function setUserRole(userId: string, role: 'user' | 'author' | 'admin') {
  await requireAdmin()
  const supabase = await createClient()

  await (supabase as any)
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  revalidatePath('/admin/users')
}

export async function toggleSuspendUser(userId: string) {
  await requireAdmin()
  const supabase = await createClient()

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('suspended_at')
    .eq('id', userId)
    .single()

  await (supabase as any)
    .from('profiles')
    .update({
      suspended_at: profile?.suspended_at ? null : new Date().toISOString(),
    })
    .eq('id', userId)

  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  await requireAdmin()
  const supabase = createServiceRoleClient()

  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(error.message)

  revalidatePath('/admin/users')
  revalidatePath('/admin/content')
}
