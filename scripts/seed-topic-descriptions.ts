// One-off: writes the approved Spanish sentence of each topic and its translations (DeepL) in tags.descriptions.
// Run: npx tsx --env-file=.env.local scripts/seed-topic-descriptions.ts
import { createClient } from '@supabase/supabase-js'
import { translateTexts, type SupportedLocale } from '@/lib/deepl'

const ES: Record<string, string> = {
  futuros: 'Escenarios, imaginarios y estrategias para pensar y construir otros mañanas posibles desde el Sur.',
  diseno: 'Cómo se diseñan las cosas, los sistemas y las ideas, y quién decide para quién se diseñan.',
  cultura: 'Lenguas, memorias, artes y formas de vida que dan forma a nuestras comunidades.',
  decolonizacion: 'Revisar los saberes, instituciones y estructuras heredadas del colonialismo, y abrir espacio a otras formas de entender el mundo.',
  innovacion: 'Ideas y prácticas que nacen en los territorios y las comunidades, no solo en los centros tecnológicos.',
  'derechos-humanos': 'Dignidad, justicia y libertades en la vida cotidiana, y las personas que las defienden.',
  soberania: 'Quién decide sobre nuestros datos, alimentos, culturas y territorios.',
  tecnologia: 'Qué tecnologías usamos, quién las crea y a quién sirven.',
  educacion: 'Aprender y enseñar más allá del aula: saberes, comunidades y habilidades para lo que viene.',
  arte: 'Imagen, sonido, palabra y gesto como formas de pensar y de resistir.',
  'habilidades-para-el-futuro': 'Capacidades para adaptarnos, crear y cuidar en un mundo que cambia.',
  sostenibilidad: 'Cuidar la vida y los recursos de los que dependemos, hoy y mañana.',
  'inteligencia-artificial': 'Qué hace la IA, quién la construye y qué significa para América Latina y el Sur Global.',
}
const OTHERS: SupportedLocale[] = ['en', 'pt', 'fr', 'de', 'da']

async function main() {
  const sb: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const slugs = Object.keys(ES)
  const byLocale: Record<string, string[]> = {}
  for (const locale of OTHERS) byLocale[locale] = await translateTexts(slugs.map((s) => ES[s]), locale, 'es')
  for (const [i, slug] of slugs.entries()) {
    const descriptions: Record<string, string> = { es: ES[slug], ...Object.fromEntries(OTHERS.map((l) => [l, byLocale[l][i]])) }
    const { error } = await sb.from('tags').update({ descriptions }).eq('slug', slug)
    console.log(slug, error ? `ERROR ${error.message}` : 'ok')
  }
}
main().catch((e) => { console.error(e); process.exit(1) })
