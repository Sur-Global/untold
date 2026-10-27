'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'

export type SetTopicResult = { ok: true } | { ok: false; error: string }

/** Makes a tag one of the topics of the site (or a plain tag again). Admins only. */
export async function setTagTopic(tagId: string, isTopic: boolean): Promise<SetTopicResult> {
  await requireAdmin()
  const supabase = await createClient()
  const { error } = await (supabase as any).from('tags').update({ is_topic: !!isTopic }).eq('id', tagId)
  if (error) return { ok: false, error: error.message ?? 'Could not save' }
  // topics show in the listings, on every piece of content and on /topics
  revalidatePath('/', 'layout')
  return { ok: true }
}
