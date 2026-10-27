import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { normalizePodcastBanner, type PodcastBanner } from '@/lib/podcast-banner'

/** The podcast banner lives in its own row of platform_settings, so saving it never touches the other banners or settings. */
export const getPodcastBanner = cache(async (): Promise<PodcastBanner> => {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('platform_settings')
      .select('settings')
      .eq('id', 'podcast_banner')
      .maybeSingle()
    if (error) return normalizePodcastBanner(null)
    return normalizePodcastBanner(data?.settings)
  } catch {
    return normalizePodcastBanner(null)
  }
})
