import sharp from 'sharp'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type ImageKind = 'cover' | 'avatar' | 'content' | 'banner' | 'hero' | 'person'

/**
 * Resizes an image to what the site needs and stores it as WebP:
 *   cover / content — up to 1200px wide, never enlarged
 *   banner          — up to 2000px wide (advertising banners carry text, so they stay sharp on big screens)
 *   hero            — up to 2400px wide at high quality: the picture at the top of a course page, shown across the whole page
 *   person          — 640×640 square photo of a teacher or facilitator of a course (any number can be stored)
 *   avatar          — 512×512 square, cropped around the most interesting part (faces)
 * Returns the public URL.
 */
export async function processAndStoreImage(buffer: Buffer, kind: ImageKind, userId: string): Promise<string> {
  let processed: Buffer
  let storagePath: string
  let bucket: string

  if (kind === 'cover') {
    processed = await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
    storagePath = `covers/${userId}/${crypto.randomUUID()}.webp`
    bucket = 'content-images'
  } else if (kind === 'banner') {
    processed = await sharp(buffer).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 85 }).toBuffer()
    storagePath = `banners/${userId}/${crypto.randomUUID()}.webp`
    bucket = 'content-images'
  } else if (kind === 'hero') {
    processed = await sharp(buffer).rotate().resize({ width: 2400, withoutEnlargement: true }).webp({ quality: 92, smartSubsample: true }).toBuffer()
    storagePath = `heroes/${userId}/${crypto.randomUUID()}.webp`
    bucket = 'content-images'
  } else if (kind === 'person') {
    processed = await sharp(buffer)
      .rotate()
      .resize(640, 640, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 88 })
      .toBuffer()
    storagePath = `people/${userId}/${crypto.randomUUID()}.webp`
    bucket = 'content-images'
  } else if (kind === 'content') {
    processed = await sharp(buffer).rotate().resize({ width: 1200, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer()
    storagePath = `inline/${userId}/${crypto.randomUUID()}.webp`
    bucket = 'content-images'
  } else {
    processed = await sharp(buffer)
      .rotate()
      .resize(512, 512, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 80 })
      .toBuffer()
    storagePath = `${userId}.webp`
    bucket = 'avatars'
  }

  const storage = createServiceRoleClient()
  const { error } = await storage.storage
    .from(bucket)
    .upload(storagePath, processed, { contentType: 'image/webp', upsert: true })
  if (error) throw new Error('Storage upload failed')

  const { data: { publicUrl } } = storage.storage.from(bucket).getPublicUrl(storagePath)
  // An avatar always lives at the same path, so add a version to defeat browser/CDN caches after a replace
  return kind === 'avatar' ? `${publicUrl}?v=${Date.now()}` : publicUrl
}
