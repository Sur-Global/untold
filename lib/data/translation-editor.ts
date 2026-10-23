import { getEnabledLocales } from '@/lib/data/enabled-locales'
import { buildTranslationEditorData, type TranslationEditorData } from '@/lib/translation-editor'

/** The data of the translation editor of a pill, video, podcast or course (what the author sees on its edit page) */
export async function loadTranslationEditor(supabase: any, contentId: string): Promise<TranslationEditorData | null> {
  const { data: content } = await supabase
    .from('content')
    .select('id, type, source_locale, single_language')
    .eq('id', contentId)
    .maybeSingle()
  if (!content || !['pill', 'video', 'podcast', 'course'].includes(content.type)) return null

  const [{ data: rows }, { data: meta }, enabledLocales] = await Promise.all([
    supabase.from('content_translations').select('locale, title, excerpt, description, body, is_auto_translated, needs_review').eq('content_id', contentId),
    content.type === 'pill'
      ? supabase.from('pill_meta').select('format, slides, slide_translations').eq('content_id', contentId).maybeSingle()
      : Promise.resolve({ data: null }),
    getEnabledLocales(),
  ])

  return buildTranslationEditorData({
    contentId,
    type: content.type,
    sourceLocale: content.source_locale ?? 'en',
    singleLanguage: !!content.single_language,
    carousel: meta?.format === 'carousel',
    rows: rows ?? [],
    slides: meta?.slides,
    slideTranslations: meta?.slide_translations,
    enabledLocales,
  })
}
