import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { readLanguageAvailability } from '@/lib/language-availability'

/**
 * Saves the availability on an existing item. A newly single-language item drops
 * its auto-translations (manual ones are kept) so readers see the original everywhere.
 */
export async function saveLanguageAvailability(
  supabase: any,
  contentId: string,
  sourceLocale: string,
  formData: FormData,
): Promise<void> {
  const availability = readLanguageAvailability(formData)
  if (!availability) return
  await supabase.from('content').update(availability).eq('id', contentId)
  if (availability.single_language) {
    // Callers have already verified the user may edit this item; translation rows
    // aren't deletable through the author's own RLS, so use the service role.
    await createServiceRoleClient()
      .from('content_translations')
      .delete()
      .eq('content_id', contentId)
      .neq('locale', sourceLocale)
      .eq('is_auto_translated', true)
  }
}
