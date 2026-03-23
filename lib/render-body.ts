import 'server-only'
import { BlockNoteSchema } from '@blocknote/core'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { ServerBlockNoteEditor } from '@blocknote/server-util'

const schema = withMultiColumn(BlockNoteSchema.create())

/**
 * Renders BlockNote JSON blocks to full HTML using the official server-side renderer.
 * Returns an empty string for empty/invalid input.
 */
export async function renderBodyToHtml(body: unknown): Promise<string> {
  if (!Array.isArray(body) || body.length === 0) return ''
  const editor = ServerBlockNoteEditor.create({ schema })
  return editor.blocksToFullHTML(body as any)
}
