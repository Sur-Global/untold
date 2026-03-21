export type Path = number[]

interface TiptapNode {
  type: string
  text?: string
  marks?: Array<{ type: string }>
  content?: TiptapNode[]
  attrs?: Record<string, unknown>
}

function getNodeAtPath(doc: TiptapNode, path: Path): TiptapNode {
  let current: TiptapNode = doc
  for (const idx of path) {
    if (!current.content) throw new Error(`Invalid path: node at index ${idx} has no content`)
    current = current.content[idx]
  }
  return current
}

export function extractTextNodes(doc: TiptapNode): { texts: string[]; paths: Path[] } {
  const texts: string[] = []
  const paths: Path[] = []

  function walk(node: TiptapNode, path: Path): void {
    if (node.type === 'codeBlock') return

    if (node.type === 'text') {
      const hasCodeMark = node.marks?.some((m) => m.type === 'code') ?? false
      if (!hasCodeMark && node.text) {
        texts.push(node.text)
        paths.push(path)
      }
      return
    }

    node.content?.forEach((child, i) => walk(child, [...path, i]))
  }

  doc.content?.forEach((child, i) => walk(child, [i]))
  return { texts, paths }
}

export function injectTextNodes(
  doc: TiptapNode,
  translations: string[],
  paths: Path[],
): TiptapNode {
  if (translations.length !== paths.length) {
    throw new Error(`translations length (${translations.length}) must equal paths length (${paths.length})`)
  }
  const result: TiptapNode = JSON.parse(JSON.stringify(doc))
  paths.forEach((path, i) => {
    getNodeAtPath(result, path).text = translations[i]
  })
  return result
}
