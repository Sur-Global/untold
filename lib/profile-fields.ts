/** Shared validation for profile fields (used by updateProfile and createAuthor). */
export function urlOrNull(raw: string | null | undefined, fieldLabel: string): string | null {
  const value = raw?.trim() || null
  if (!value) return null
  if (!/^https?:\/\//i.test(value)) throw new Error(`${fieldLabel} must start with http:// or https://`)
  return value
}

export function emailOrNull(raw: string | null | undefined): string | null {
  const value = raw?.trim() || null
  if (!value) return null
  if (!/^\S+@\S+\.\S+$/.test(value)) throw new Error('Contact email looks invalid')
  return value
}

/** For the author "call to action" button: web links or a mailto: address. */
export function linkOrMailtoOrNull(raw: string | null | undefined, fieldLabel: string): string | null {
  const value = raw?.trim() || null
  if (!value) return null
  if (!/^(https?:\/\/|mailto:)/i.test(value)) throw new Error(`${fieldLabel} must start with https://, http:// or mailto:`)
  return value
}
