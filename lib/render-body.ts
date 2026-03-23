import 'server-only'
import { BlockNoteSchema } from '@blocknote/core'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { ServerBlockNoteEditor } from '@blocknote/server-util'

const schema = withMultiColumn(BlockNoteSchema.create())

/**
 * Renders BlockNote JSON blocks to full HTML using the official server-side renderer.
 * Returns null if rendering fails (caller should fall back to blockNoteToHtml).
 */
export async function renderBodyToHtml(body: unknown): Promise<string | null> {
  if (!Array.isArray(body) || body.length === 0) return null
  try {
    const editor = ServerBlockNoteEditor.create({ schema })
    return await editor.blocksToFullHTML(body as any)
  } catch (err) {
    console.error('[renderBodyToHtml] failed, will fall back to blockNoteToHtml:', err)
    return null
  }
}
