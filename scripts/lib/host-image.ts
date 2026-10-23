import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
import { randomUUID } from 'node:crypto'

type Kind = 'cover' | 'content' | 'avatar'

const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
}).storage

/**
 * Copies an image from another site into the platform's own storage, with the same rules as the
 * editor's uploads (lib/image-upload.ts): covers and photos up to 1200px wide as WebP, portraits 512×512.
 */
export async function hostImage(url: string, kind: Kind, ownerId: string): Promise<string> {
  const res = await fetch(url, { redirect: 'follow' })
  if (!res.ok) throw new Error(`${res.status} fetching ${url}`)
  const input = Buffer.from(await res.arrayBuffer())

  const bucket = kind === 'avatar' ? 'avatars' : 'content-images'
  const path = kind === 'avatar' ? `${ownerId}.webp` : `${kind === 'cover' ? 'covers' : 'inline'}/${ownerId}/${randomUUID()}.webp`
  const body =
    kind === 'avatar'
      ? await sharp(input).rotate().resize(512, 512, { fit: 'cover', position: sharp.strategy.attention }).webp({ quality: 80 }).toBuffer()
      : await sharp(input).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: kind === 'cover' ? 80 : 82 }).toBuffer()

  const { error } = await storage.from(bucket).upload(path, body, { contentType: 'image/webp', upsert: true })
  if (error) throw new Error(`Storage upload failed: ${error.message}`)
  const { data: { publicUrl } } = storage.from(bucket).getPublicUrl(path)
  return kind === 'avatar' ? `${publicUrl}?v=${Date.now()}` : publicUrl
}

/** True for images still living on Ghost or on a stock-photo site (not in our own storage). */
export const isExternalImage = (url: string | null | undefined): url is string =>
  !!url && /^https?:\/\//.test(url) && !/supabase\.co\/storage/.test(url)
