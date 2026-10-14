/**
 * Profile photos must be uploaded (so they're resized and hosted by us), not linked.
 * True when the URL points at our own avatars bucket.
 */
export function isHostedAvatarUrl(url: string | null | undefined): boolean {
  if (!url) return false
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return false
  return url.startsWith(`${base.replace(/\/$/, '')}/storage/v1/object/public/avatars/`)
}

/** Throws unless the avatar is empty, unchanged, or one of our own uploads. */
export function assertUploadedAvatar(next: string | null, current: string | null | undefined): void {
  if (!next || next === (current ?? null)) return
  if (!isHostedAvatarUrl(next)) {
    throw new Error('Please upload your photo instead of using a link')
  }
}
