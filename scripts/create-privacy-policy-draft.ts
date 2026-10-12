/**
 * Creates (or refreshes) the DRAFT privacy policy page in Spanish — not published, not in the footer —
 * and writes the same text to docs/politica-de-privacidad-borrador.md so it can be sent to a lawyer.
 *
 * Run: npx tsx --env-file=.env.local scripts/create-privacy-policy-draft.ts
 */
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { writeFileSync } from 'node:fs'

type Part = { h2: string } | { h3: string } | { p: string } | { ul: string[] }

const TITLE = 'Política de privacidad'
const SLUG = 'politica-de-privacidad'

const PARTS: Part[] = [
  {
    p: 'BORRADOR PARA REVISIÓN LEGAL — no publicado. Los textos entre corchetes [ ] necesitan un dato real o una decisión jurídica. Borra esta nota antes de publicar.',
  },
  { p: 'Última actualización: [FECHA]' },

  { h2: '1. Quiénes somos' },
  {
    p: 'UNTOLD.ink (“UNTOLD”, “nosotros”) es una publicación de SurGlobal. El responsable del tratamiento de tus datos personales es [NOMBRE LEGAL DE LA ENTIDAD], con domicilio en [DIRECCIÓN] y correo de contacto [EMAIL DE CONTACTO].',
  },

  { h2: '2. Qué datos tratamos' },
  {
    ul: [
      'Cuenta: tu correo electrónico, tu contraseña (almacenada cifrada por nuestro proveedor de autenticación) y tu nombre visible.',
      'Perfil público: tu foto, biografía, ubicación, página web, redes sociales, un botón de acción opcional y, si decides mostrarlo, un correo de contacto.',
      'Contenido que publicas (artículos, videos, píldoras de conocimiento, podcasts, cursos) y sus datos asociados: fechas, idioma original, etiquetas y la confirmación de responsabilidad que aceptas al publicar, con su fecha.',
      'Interacciones: “me gusta”, guardados y personas a las que sigues.',
      'Boletín: tu correo y, si lo indicas, tu nombre, cuando te suscribes.',
      'Datos técnicos: dirección IP, tipo de navegador y registros del servidor, generados por nuestro proveedor de alojamiento, y cookies técnicas necesarias para mantener tu sesión.',
    ],
  },

  { h2: '3. Para qué los usamos y con qué base legal' },
  {
    ul: [
      'Crear y gestionar tu cuenta, y permitirte publicar contenido: ejecución del servicio que solicitas.',
      'Mostrar tu perfil y tu contenido junto a tu nombre: ejecución del servicio, porque la autoría pública es la esencia de la plataforma.',
      'Traducir tu contenido a otros idiomas: ejecución del servicio.',
      'Moderar contenido, prevenir spam y abusos y garantizar la seguridad: interés legítimo.',
      'Enviarte el boletín: tu consentimiento, que puedes retirar en cualquier momento desde cada correo.',
      'Cumplir obligaciones legales cuando corresponda: obligación legal.',
    ],
  },

  { h2: '4. Qué es público' },
  {
    p: 'Tu nombre, tu foto, tu biografía, tus enlaces y todo el contenido que publiques son públicos, aparecen junto a tu contenido y pueden ser indexados por buscadores. Tu correo de acceso nunca se muestra.',
  },
  {
    p: 'Te pedimos tu nombre y una foto que te represente porque buscamos creadores humanos dispuestos a responsabilizarse de lo que publican. Tu perfil es público y aparecerá junto a todo tu contenido.',
  },
  {
    p: 'Si por razones de seguridad no puedes mostrar tu rostro o tu nombre, escríbenos a [EMAIL DE CONTACTO] y buscaremos una alternativa. [Decisión editorial/legal: ¿se admiten seudónimos verificados?]',
  },

  { h2: '5. Con quién compartimos datos' },
  { p: 'Usamos proveedores que tratan datos por nuestra cuenta (encargados del tratamiento):' },
  {
    ul: [
      'Supabase: base de datos, autenticación y almacenamiento de archivos e imágenes.',
      'Vercel: alojamiento del sitio web.',
      'DeepL: traducción automática. El texto de tus contenidos (título, resumen, cuerpo, descripción) se envía a DeepL para traducirlo.',
      'Sender: envío del boletín y de correos de notificación del equipo.',
      'YouTube y Vimeo: reproducción de videos incrustados. Al reproducirlos, estos servicios pueden tratar datos según sus propias políticas. [Verificar si se usa el modo de privacidad mejorada en todos los casos.]',
    ],
  },
  { p: 'No vendemos tus datos personales.' },

  { h2: '6. Transferencias internacionales' },
  {
    p: 'Algunos de estos proveedores pueden tratar datos fuera del Espacio Económico Europeo, incluidos Estados Unidos. En esos casos nos apoyamos en [garantías: cláusulas contractuales tipo / decisión de adecuación / marco de privacidad de datos UE-EE. UU. — COMPLETAR según cada proveedor].',
  },

  { h2: '7. Cuánto tiempo conservamos los datos' },
  {
    ul: [
      'Cuenta, perfil y contenido: mientras mantengas tu cuenta. Puedes despublicar o eliminar tu contenido en cualquier momento.',
      'Si eliminas tu cuenta, borramos tus datos personales y tu perfil. Pueden persistir copias de seguridad durante un máximo de [X] días.',
      'Boletín: hasta que te des de baja.',
      'Registros técnicos: [X] días.',
    ],
  },

  { h2: '8. Tus derechos' },
  {
    p: 'Puedes ejercer en cualquier momento tus derechos de acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad, y retirar tu consentimiento, escribiendo a [EMAIL DE CONTACTO]. Si consideras que no hemos atendido tus derechos, puedes reclamar ante la autoridad de protección de datos de tu país [por ejemplo, la AEPD en España].',
  },

  { h2: '9. Cookies' },
  {
    p: 'Usamos únicamente cookies técnicas necesarias para el funcionamiento del sitio (por ejemplo, mantener tu sesión y tu idioma). [Confirmar si se añade analítica o publicidad; en ese caso hace falta un banner de consentimiento.]',
  },

  { h2: '10. Contenido publicado por los creadores' },
  { h3: '10.1 Responsabilidad' },
  {
    p: 'Cada creador es el único responsable del contenido que publica: su veracidad, originalidad, legalidad y los derechos sobre textos, imágenes, citas, audios y videos. Las opiniones expresadas son de quien las firma y no representan a UNTOLD ni a SurGlobal.',
  },
  { h3: '10.2 Declaración al publicar' },
  {
    p: 'Para publicar, el creador confirma que es el autor del contenido o tiene derecho a publicarlo, que ha acreditado fuentes e imágenes y que entiende que UNTOLD puede despublicarlo si esto no se cumple. Guardamos la fecha de esa confirmación.',
  },
  { h3: '10.3 Licencia' },
  {
    p: 'El creador conserva la titularidad de su contenido. Mientras esté publicado, concede a UNTOLD una licencia no exclusiva, mundial y gratuita para alojarlo, mostrarlo, reproducirlo, adaptar su formato, traducirlo (incluida la traducción automática), indexarlo y promocionarlo en sus canales (por ejemplo, boletín y redes sociales) con atribución al autor. [Revisar alcance y si se desea licencia de archivo tras la despublicación.]',
  },
  { h3: '10.4 Contenido no permitido' },
  {
    ul: [
      'Material que infrinja derechos de autor o de terceros.',
      'Contenido difamatorio, discriminatorio, que incite al odio o a la violencia.',
      'Datos personales de terceros sin su consentimiento.',
      'Spam, publicidad encubierta o contenido engañoso.',
      'Contenido generado automáticamente y presentado como propio sin supervisión ni responsabilidad humana. [Decidir y redactar con criterio legal.]',
    ],
  },
  { h3: '10.5 Moderación y contenido destacado' },
  {
    p: 'UNTOLD no revisa el contenido antes de que se publique en la página personal de su creador. Puede despublicar o eliminar contenido y suspender cuentas, con o sin aviso previo, cuando detecte un incumplimiento. El equipo editorial decide qué contenido se destaca en las páginas generales y en la portada; destacar un contenido no implica que UNTOLD lo respalde.',
  },
  { h3: '10.6 Reclamaciones' },
  {
    p: 'Si crees que un contenido infringe tus derechos, escribe a [EMAIL PARA RECLAMACIONES] indicando el enlace, el derecho que consideras vulnerado, tus datos de contacto y una declaración de buena fe. Revisaremos la reclamación y retiraremos el contenido cuando corresponda.',
  },
  { h3: '10.7 Traducciones automáticas' },
  {
    p: 'Las traducciones automáticas pueden contener errores. La versión en el idioma original del creador es la de referencia. El creador puede corregir o sustituir las traducciones.',
  },
  { h3: '10.8 Indemnidad' },
  {
    p: 'El creador mantendrá indemne a UNTOLD y a SurGlobal frente a reclamaciones de terceros derivadas de su contenido, en la medida permitida por la ley. [Revisar validez y alcance según la jurisdicción y, sobre todo, si se aplica a personas consumidoras.]',
  },
  { h3: '10.9 Limitación de responsabilidad de UNTOLD' },
  {
    p: 'UNTOLD no garantiza la disponibilidad ininterrumpida del servicio y no responde del contenido publicado por terceros, salvo lo que establezca la ley. [Revisar redacción y límites legales.]',
  },

  { h2: '11. Menores' },
  { p: 'El servicio no está dirigido a menores de [16] años y no recogemos conscientemente sus datos.' },

  { h2: '12. Seguridad' },
  {
    p: 'Aplicamos medidas técnicas y organizativas razonables para proteger tus datos. Ningún sistema es completamente seguro; si detectamos una brecha que te afecte, te lo comunicaremos conforme a la ley.',
  },

  { h2: '13. Cambios en esta política' },
  { p: 'Podemos actualizar esta política. Publicaremos la versión vigente con su fecha y, si el cambio es importante, te lo avisaremos.' },

  { h2: '14. Contacto' },
  { p: 'Para cualquier duda sobre privacidad o sobre esta política: [EMAIL DE CONTACTO].' },
]

function block(type: string, text: string, props: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    type,
    props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', ...props },
    content: [{ type: 'text', text, styles: {} }],
    children: [],
  }
}

function toBlocks(parts: Part[]) {
  const blocks: any[] = []
  for (const part of parts) {
    if ('h2' in part) blocks.push(block('heading', part.h2, { level: 2, isToggleable: false }))
    else if ('h3' in part) blocks.push(block('heading', part.h3, { level: 3, isToggleable: false }))
    else if ('p' in part) blocks.push(block('paragraph', part.p))
    else for (const item of part.ul) blocks.push(block('bulletListItem', item))
  }
  return blocks
}

function toMarkdown(parts: Part[]) {
  const lines: string[] = [`# ${TITLE}`, '']
  for (const part of parts) {
    if ('h2' in part) lines.push(`## ${part.h2}`, '')
    else if ('h3' in part) lines.push(`### ${part.h3}`, '')
    else if ('p' in part) lines.push(part.p, '')
    else lines.push(...part.ul.map((i) => `- ${i}`), '')
  }
  return lines.join('\n')
}

async function main() {
  writeFileSync('docs/politica-de-privacidad-borrador.md', toMarkdown(PARTS))

  const sb: any = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: existing } = await sb.from('static_pages').select('id, status').eq('slug', SLUG).maybeSingle()
  let pageId: string
  if (existing) {
    if (existing.status === 'published') throw new Error('The page is already published — refusing to overwrite it.')
    pageId = existing.id
    console.log('Updating existing draft', pageId)
  } else {
    const { data: page, error } = await sb
      .from('static_pages')
      .insert({ slug: SLUG, status: 'draft', show_in_footer: false, footer_sort_order: 0, published_at: null })
      .select('id')
      .single()
    if (error || !page) throw new Error(error?.message ?? 'Could not create the page')
    pageId = page.id
    console.log('Created draft page', pageId)
  }

  const { error: trError } = await sb
    .from('static_page_translations')
    .upsert({ static_page_id: pageId, locale: 'es', title: TITLE, body: toBlocks(PARTS) }, { onConflict: 'static_page_id,locale' })
  if (trError) throw new Error(trError.message)
  console.log('Spanish text saved. Slug:', SLUG, '— status: draft (not public)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
