// Server-side rules for what a body may contain, so they hold even if someone bypasses the editor UI.
// Knowledge pills can't contain videos, audio or files at all. Blocks that were already in the
// stored body are left alone, so editing an older item never silently deletes its content.
const MEDIA_TYPES = new Set(['video', 'audio', 'file', 'videoEmbed'])

function collectIds(blocks: unknown, ids = new Set<string>()): Set<string> {
  if (Array.isArray(blocks)) {
    for (const b of blocks) collectIds(b, ids)
  } else if (blocks && typeof blocks === 'object') {
    const block = blocks as any
    if (typeof block.id === 'string') ids.add(block.id)
    collectIds(block.children, ids)
    collectIds(block.content, ids) // table cells / columns nest blocks here
  }
  return ids
}

function strip(blocks: any[], keep: Set<string>): any[] {
  const out: any[] = []
  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue
    const isNewMedia = MEDIA_TYPES.has(block.type) && !keep.has(block.id)
    if (isNewMedia) continue
    out.push({
      ...block,
      ...(Array.isArray(block.children) ? { children: strip(block.children, keep) } : {}),
    })
  }
  return out
}

/** Removes video/audio/file blocks that aren't already in `existingBody` (pills only). */
export function stripNewMediaBlocks<T>(body: T, existingBody?: unknown): T {
  if (!Array.isArray(body)) return body
  return strip(body, collectIds(existingBody ?? [])) as unknown as T
}
