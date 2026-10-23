import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { normalizeHomeBanners, type HomeBanners } from '@/lib/home-banners'

/** Banners live in their own row of platform_settings so saving them never touches the other settings. */
export const getHomeBanners = cache(async (): Promise<HomeBanners> => {
  try {
    const supabase = await createClient()
    const { data, error } = await (supabase as any)
      .from('platform_settings')
      .select('settings')
      .eq('id', 'banners')
      .maybeSingle()
    if (error) return normalizeHomeBanners(null)
    return normalizeHomeBanners(data?.settings)
  } catch {
    return normalizeHomeBanners(null)
  }
})
