/**
 * Adds the "Normas citadas" list (from Óscar's Google Sheet, rows 14–21) at the end of the draft "El sentido común",
 * after "Referencias" and before the footnote blocks. Only touches the draft if nobody has edited it since it was created.
 *
 * Run: npx tsx --env-file=.env.local scripts/add-normas-oscar.ts <path to the JSON dump of the draft as created>
 */
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { Draft } from './lib/draft-blocks'

const ID = '90830014-ecca-40c1-9f33-958655b63463'

// Chronological. The sheet dates the DL 442 as 27-09-1957; the decree that created INDECI is of 27 September 1987.
const NORMAS: { norma: string; fecha: string; denominacion: string; url: string }[] = [
  {
    norma: 'Ley N.º 12800',
    fecha: '9 de febrero de 1957',
    denominacion: 'Crea la Corporación de Reconstrucción y Fomento del Cuzco.',
    url: 'https://docs.peru.justia.com/federales/leyes/12800-feb-9-1957.pdf',
  },
  {
    norma: 'Ley N.º 19338',
    fecha: '28 de marzo de 1972',
    denominacion: 'Creación del Sistema Nacional de Defensa Civil (SINADECI).',
    url: 'https://www.studocu.com/pe/document/escuela-militar-de-chorrillos-coronel-francisco-bolognesi/historia/ley-19338-creacion-sinadeci-indeci/119546597?sid=730113451791988116',
  },
  {
    norma: 'Decreto Legislativo N.º 442',
    fecha: '27 de septiembre de 1987',
    denominacion: 'Creación del Instituto Nacional de Defensa Civil.',
    url: 'https://cdn.www.gob.pe/uploads/document/file/2428695/Decreto%20Legislativo%20N%C2%B0%20442%2C%20Ley%20creaci%C3%B3n%20del%20INDECI.%20%28Nov%202021%29.pdf.pdf?v=1637060522',
  },
  {
    norma: 'Ley N.º 29087',
    fecha: '13 de septiembre de 2007',
    denominacion:
      'Ley que modifica el numeral 1 del artículo 4º y el párrafo 5.2 del artículo 5º de la Ley Nº 29078, Ley que crea el Fondo para la Reconstrucción Integral de las Zonas Afectadas por los Sismos del 15 de agosto de 2007, denominado “FORSUR”.',
    url: 'https://docs.peru.justia.com/federales/leyes/29087-sep-13-2007.pdf',
  },
  {
    norma: 'Ley N.º 30556',
    fecha: '29 de abril de 2017',
    denominacion:
      'Ley que aprueba disposiciones de carácter extraordinario para las Intervenciones del gobierno nacional Frente a Desastres y que dispone la creación de la Autoridad para la Reconstrucción Con Cambios (ARCC).',
    url: 'https://cdn.www.gob.pe/uploads/document/file/390172/Ley_30556.pdf?v=1571239706',
  },
  {
    norma: 'Ley N.º 31841',
    fecha: '20 de julio de 2023',
    denominacion: 'Ley que crea la Autoridad Nacional de Infraestructura (ANIN).',
    url: 'https://cdn.www.gob.pe/uploads/document/file/5432622/4853638-ley-31841-ley-que-crea-la-anin.pdf?v=1700164782',
  },
  {
    norma: 'Resolución Suprema N.º 256-2026-PCM',
    fecha: '12 de agosto de 2026',
    denominacion: 'Constituyen la Comisión Nacional de Gestión del Riesgo del Fenómeno El Niño.',
    url: 'https://busquedas.elperuano.pe/dispositivo/EX/2542966-2',
  },
]

const canon = (x: unknown) =>
  JSON.stringify(x, (k, v) =>
    k === 'id' || k === 'ref' ? undefined : v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map((key) => [key, v[key]])) : v,
  )

async function main() {
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: tr, error } = await sb.from('content_translations').select('id, body').eq('content_id', ID).eq('locale', 'es').single()
  if (error || !tr) throw new Error(error?.message ?? 'draft not found')
  const body = tr.body as any[]

  // As created, plus the one cell already updated from the sheet: anything else means somebody has edited the draft
  const created = JSON.parse(readFileSync(process.argv[2], 'utf8'))
  const cell = created.find((b: any) => b.type === 'table').content.rows[8].cells[3].content.find((i: any) => i.styles?.bold)
  cell.text = 'Comisión Nacional de Gestión del Riesgo del Fenómeno El Niño 2026-2027'
  if (canon(body) !== canon(created)) throw new Error('The draft has been edited since it was created: not touching it.')

  const d = new Draft()
  d.h(2, 'Normas citadas')
  for (const n of NORMAS) d.bullet(`${n.norma} (${n.fecha}). ${n.denominacion} [${n.url}](${n.url})`)
  const added = d.build()

  const firstNote = body.findIndex((b) => b.type === 'footnote')
  const next = [...body.slice(0, firstNote), ...added, ...body.slice(firstNote)]
  const { error: upError } = await sb.from('content_translations').update({ body: next }).eq('id', tr.id)
  if (upError) throw new Error(upError.message)
  console.log(`✓ added "Normas citadas" (${NORMAS.length} items) before the notes; ${body.length} → ${next.length} blocks`)
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
})
