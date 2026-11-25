/**
 * Remove embedded "Sobre [Name]" / "About [Name]" author bio sections
 * from the bottom of article bodies in content_translations.
 *
 * Ghost imported articles often have the author bio baked into the article body
 * as a heading + paragraphs at the end. This script strips those out.
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SOBRE_PATTERN = /^(Sobre|About|Acerca de|Über|Sur|Om)\s+\w/i

function getTextFromNode(node: any): string {
  if (!node) return ''
  if (node.text) return node.text
  if (Array.isArray(node.content)) {
    return node.content.map(getTextFromNode).join('')
  }
  return ''
}

function findSobreIndex(bodyContent: any[]): number {
  const checkFrom = Math.max(0, bodyContent.length - 15)
  for (let i = checkFrom; i < bodyContent.length; i++) {
    const node = bodyContent[i]
    if (node.type === 'heading') {
      const text = getTextFromNode(node).trim()
      if (SOBRE_PATTERN.test(text)) {
        return i
      }
    }
  }
  return -1
}

async function main() {
  console.log('Fetching all content_translations with non-null body...')

  let page = 0
  const pageSize = 100
  let totalProcessed = 0
  let totalUpdated = 0
  let totalSkipped = 0

  while (true) {
    const { data: rows, error } = await (supabase as any)
      .from('content_translations')
      .select('id, locale, body, content_id')
      .not('body', 'is', null)
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (error) {
      console.error('Error fetching rows:', error)
      break
    }

    if (!rows || rows.length === 0) break

    for (const row of rows) {
      totalProcessed++

      const body = row.body as any
      if (!body || typeof body !== 'object' || !Array.isArray(body.content)) {
        totalSkipped++
        continue
      }

      const sobreIdx = findSobreIndex(body.content)
      if (sobreIdx === -1) {
        totalSkipped++
        continue
      }

      const originalLength = body.content.length
      const trimmedBody = {
        ...body,
        content: body.content.slice(0, sobreIdx),
      }

      const { error: updateError } = await (supabase as any)
        .from('content_translations')
        .update({ body: trimmedBody })
        .eq('id', row.id)

      if (updateError) {
        console.error(`  ✗ Failed to update row ${row.id} (locale: ${row.locale}):`, updateError.message)
      } else {
        const headingText = getTextFromNode(body.content[sobreIdx]).trim()
        console.log(`  ✓ [${row.locale}] content_id=${row.content_id}: removed "${headingText}" section (was ${originalLength} nodes → now ${sobreIdx})`)
        totalUpdated++
      }
    }

    if (rows.length < pageSize) break
    page++
  }

  console.log('\n=== Summary ===')
  console.log(`Total rows processed: ${totalProcessed}`)
  console.log(`Rows updated:         ${totalUpdated}`)
  console.log(`Rows skipped:         ${totalSkipped}`)
}

main().catch(console.error)
