'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/require-admin'
import { normalizePodcastBanner } from '@/lib/podcast-banner'
import { routing } from '@/i18n/routing'

export type SavePodcastBannerResult = { ok: true } | { ok: false; error: string }

export async function savePodcastBanner(payload: unknown): Promise<SavePodcastBannerResult> {
  await requireAdmin()
  const settings = normalizePodcastBanner(payload)
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('platform_settings')
    .upsert({ id: 'podcast_banner', settings }, { onConflict: 'id' })
  if (error) return { ok: false, error: error.message ?? 'Could not save the banner' }

  for (const loc of routing.locales) revalidatePath(`/${loc}/podcasts`, 'page')
  revalidatePath('/podcasts', 'page')
  return { ok: true }
}
