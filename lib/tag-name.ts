/** The name of a tag in the reader's language; if it is not translated yet: English, any language it has, or its slug */
export function tagDisplayName(names: Record<string, string> | null | undefined, locale: string, slug: string): string {
  const own = names?.[locale]?.trim()
  if (own) return own
  const english = names?.en?.trim()
  if (english) return english
  const any = Object.values(names ?? {}).find((name) => typeof name === 'string' && name.trim())
  return any?.trim() ?? slug
}

/** The slug of a tag typed by a person: accents are turned into plain letters ("decolonización" → "decolonizacion") */
export function tagSlugFor(name: string, slugify: (text: string) => string): string {
  return slugify(name.trim().normalize('NFKD').replace(/[̀-ͯ]/g, ''))
}
