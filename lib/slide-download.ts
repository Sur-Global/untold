// Browser side of the carousel downloads: the pictures of the slides come from /api/pill-slides/<slug>.

export const slidesUrl = (slug: string, locale: string, n?: number) =>
  `/api/pill-slides/${encodeURIComponent(slug)}?locale=${locale}${n ? `&n=${n}` : ''}`

const fileName = (slug: string, i: number) => `${slug}-${String(i + 1).padStart(2, '0')}.jpg`

/** The pictures of all the slides, as files ready to share */
export async function fetchSlideFiles(slug: string, locale: string, count: number): Promise<File[]> {
  return Promise.all(
    Array.from({ length: count }, async (_, i) => {
      const res = await fetch(slidesUrl(slug, locale, i + 1))
      if (!res.ok) throw new Error(`Slide ${i + 1} failed (${res.status})`)
      return new File([await res.blob()], fileName(slug, i), { type: 'image/jpeg' })
    }),
  )
}

/** Saves the pictures of all the slides in one ZIP file */
export async function downloadSlidesZip(slug: string, locale: string): Promise<void> {
  const res = await fetch(slidesUrl(slug, locale))
  if (!res.ok) throw new Error(`Download failed (${res.status})`)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(await res.blob())
  link.download = `${slug}-laminas.zip`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(link.href), 10_000)
}

/** Phones can hand pictures to another app (Instagram, WhatsApp…) from their share sheet; computers cannot */
export function canSharePictures(): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') return false
  if (!window.matchMedia?.('(pointer: coarse)')?.matches) return false
  try {
    return navigator.canShare({ files: [new File([''], 'a.jpg', { type: 'image/jpeg' })] })
  } catch {
    return false
  }
}
