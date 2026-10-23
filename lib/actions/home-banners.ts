'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { normalizeHomeBanners } from '@/lib/home-banners'
import { routing } from '@/i18n/routing'

export type SaveBannersResult = { ok: true } | { ok: false; error: string }

export async function saveHomeBanners(payload: unknown): Promise<SaveBannersResult> {
  await requireAdmin()
  const settings = normalizeHomeBanners(payload)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('platform_settings')
    .upsert({ id: 'banners', settings }, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message ?? 'Could not save the banners' }

  revalidatePath('/', 'layout')
  for (const loc of routing.locales) revalidatePath(`/${loc}`, 'page')
  return { ok: true }
}
