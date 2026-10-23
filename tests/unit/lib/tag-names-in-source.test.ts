import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

// A tag has a name in every language. Wherever one is shown it must go through tagDisplayName (the person's language,
// then English, then any other, then the slug) — never "the English name" or "the name, or nothing", which is how a
// Spanish tag ended up in an English tag cloud and English names in the Spanish edit forms.
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (name === 'node_modules' || name === '.next') return []
    return statSync(path).isDirectory() ? walk(path) : /\.(ts|tsx)$/.test(name) ? [path] : []
  })

const files = ['app', 'components', 'lib'].flatMap((dir) => walk(join(process.cwd(), dir)))
const allowed = ['lib/tag-name.ts', 'app/api/translate-tags/route.ts', 'lib/supabase/types.ts']

describe('tag names in the source', () => {
  it('are only chosen by tagDisplayName', () => {
    const offenders = files
      .filter((file) => !allowed.some((ok) => file.endsWith(ok)))
      .filter((file) => /\bnames\??\.(\[locale\]|en\b|\["en"\]|\['en'\])|names\[locale\]|names\['en'\]/.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(process.cwd() + '/', ''))
    expect(offenders).toEqual([])
  })
})
