import { cache } from 'react'
import { getPlatformSettings } from '@/lib/data/platform-settings'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { mergePlatformSettings } from '@/lib/platform-settings/defaults'

/** Languages switched on for the public site (Admin → Settings → Languages). For pages and layouts. */
export const getEnabledLocales = cache(async (): Promise<string[]> => {
  const settings = await getPlatformSettings()
  return settings.languages.enabled
})

/** Same list for background jobs and API routes that run without a visitor's session. */
export async function getEnabledLocalesForJobs(): Promise<string[]> {
  try {
    const { data } = await (createServiceRoleClient() as any)
      .from('platform_settings')
      .select('settings')
      .eq('id', 'default')
      .maybeSingle()
    return mergePlatformSettings(data?.settings).languages.enabled
  } catch {
    return mergePlatformSettings(null).languages.enabled
  }
}
