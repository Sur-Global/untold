export const SUPPORTED_LOCALES = ['en', 'es', 'pt', 'fr', 'de', 'da'] as const
export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

const DEEPL_TARGET_MAP: Record<SupportedLocale, string> = {
  en: 'EN-US',
  es: 'ES',
  pt: 'PT',
  fr: 'FR',
  de: 'DE',
  da: 'DA',
}

const DEEPL_SOURCE_MAP: Record<string, string> = {
  en: 'EN', es: 'ES', pt: 'PT', fr: 'FR', de: 'DE', da: 'DA',
}

function getDeepLBaseUrl(): string {
  const key = process.env.DEEPL_API_KEY ?? ''
  return key.endsWith(':fx')
    ? 'https://api-free.deepl.com/v2'
    : 'https://api.deepl.com/v2'
}

export async function translateTexts(
  texts: string[],
  targetLocale: SupportedLocale,
  sourceLocale?: string,
): Promise<string[]> {
  const apiKey = process.env.DEEPL_API_KEY
  if (!apiKey) throw new Error('DEEPL_API_KEY is not set')
  const url = `${getDeepLBaseUrl()}/translate`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `DeepL-Auth-Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: texts,
      target_lang: DEEPL_TARGET_MAP[targetLocale],
      ...(sourceLocale && DEEPL_SOURCE_MAP[sourceLocale]
        ? { source_lang: DEEPL_SOURCE_MAP[sourceLocale] }
        : {}),
    }),
  })

  if (!res.ok) {
    throw new Error(`DeepL error: ${res.status} ${res.statusText}`)
  }

  const data = await res.json()
  return (data.translations as Array<{ text: string }>).map((t) => t.text)
}
