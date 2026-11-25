/**
 * Draft: "El sentido común — Los riesgos de desastres", by Óscar Pastor Paredes.
 * Source: "Sentido común FINAL.docx (1).pdf". Saved as a DRAFT (nothing is published).
 *
 * Run:  npx tsx --env-file=.env.local scripts/create-draft-oscar-pastor.ts          (creates it)
 *       npx tsx --env-file=.env.local scripts/create-draft-oscar-pastor.ts --dry    (only writes the JSON to the path given in DRAFT_DUMP)
 */
import { writeFileSync } from 'node:fs'
import { Draft, saveDraft } from './lib/draft-blocks'

// Elsie's own profile: the author is set to the real person from the editor (the author does not have a profile yet)
const ELSIE_ID = 'a8e8b051-dd04-45f8-a68e-8cc37ff1000a'

const SBN = 'https://www.gob.pe/institucion/sbn/informes-publicaciones/7377878-informe-participacion-de-simulacro-nacional'
const SALECL =
  'https://books.google.es/books?hl=es&lr=&id=gVXJEQAAQBAJ&oi=fnd&pg=PT8&dq=la+ignorancia+es+una+elecci%C3%B3n+personal&ots=F1wElBEmrU&sig=_-EN96k3hUCn3g-vQ0ZPlMOqfAc#v=onepage&q&f=false'
const UNDRR = 'https://www.undrr.org/terminology/disaster'
const SOTO = 'https://www.youtube.com/watch?v=4T4JKQ0XK98'
const ESAN = 'https://www.esan.edu.pe/conexion-esan/gestion-del-riesgo-de-desastres-cuales-son-las-etapas-de-este-proceso'
const DOI = 'https://doi.org/10.70747/cr.v4i1.87'

const d = new Draft()

// ─── Notes (numbered by the order of their numbers in the text) ───────────────────────────────────────────
d.note(
  'undrr',
  `UNDRR: “Una alteración grave del funcionamiento de una comunidad o sociedad a cualquier escala debido a eventos peligrosos que interactúan con condiciones de exposición, vulnerabilidad y capacidad, lo que conlleva una o más de las siguientes pérdidas e impactos humanos, materiales, económicos y ambientales”. Oficina de las Naciones Unidas para la Reducción del Riesgo de Desastres, [${UNDRR}](${UNDRR})`,
)
d.note(
  'soto',
  `Este artículo toma diversos conceptos desarrollados en SOTO, Cristina, Liberalístico “Como se fabrica el sentido común”, [${SOTO}](${SOTO}), que se complementan con investigaciones desarrolladas por el autor.`,
)
d.note('lyotard', 'Lyotard Jean-François. La condición postmoderna Informe sobre el saber. Ediciones Cátedra. Madrid Segunda edición: junio 1991. I.S.B.N. 950-495-030-X')
d.note('salecl', `SALECL Renata, pasión por la ignorancia. Ediciones Godot Argentina 2020. [${SALECL}](${SALECL})`)
d.note('harari', 'Harari, Y. N. (2024). *Nexus: Una breve historia de las redes de información desde la Edad de Piedra hasta la IA*. Debate.')
d.note(
  'pastor2025',
  `Pastor Paredes, O. (2025). Números, Intersubjetividad y Poder: Análisis Crítico de los Presupuestos Públicos desde una Perspectiva Social. *Ciencia Y Reflexión, 4*(1), 996–1018. [${DOI}](${DOI})`,
)
d.note(
  'tesis',
  'Pastor Paredes, O. “Influencia del conocimiento en el diseño y ejecución de las políticas y gestión pública en la gestión del agua urbana en el Perú. Tesis para optar el grado de doctor en ciencias sociales. Universidad Nacional de San Marcos, Lima, Perú 2022.',
)
d.note('esan', `ESAN: Gestión del Riesgo de Desastres: ¿Cuáles son las etapas de este proceso? (2022). [${ESAN}](${ESAN})`)

// ─── Article ──────────────────────────────────────────────────────────────────────────────────────────────
d.p('Por Óscar Pastor Paredes', { styles: { bold: true, italic: true } })

d.p(
  `Al sonido de una sirena, escuelas, oficinas y viviendas de todo el Perú se vacían en orden, la gente se forma en las zonas seguras señalizadas y, pocos minutos después, vuelve a lo que estaba haciendo. Los informes que cada entidad del Estado presenta después del ejercicio dan cuenta de la convocatoria, de la preparación y de los resultados. Una de ellas [reportó los tres simulacros nacionales de 2025 con cien por ciento de participación](${SBN}). En el tercero, ese cien por ciento eran nueve vigilantes de una empresa contratista, porque el ejercicio se programó a las ocho de la noche. Los dos informes anteriores habían señalado las mismas deficiencias y recomendado las mismas correcciones, con tres meses de diferencia.`,
)
d.p(
  'Nada de esto es un descuido administrativo. El Estado delega en el gobierno la conducción de las decisiones públicas y, al mismo tiempo, transmite —de manera casi imperceptible— relatos y valores con los que una sociedad configura su sentido común: ese conjunto de ideas que, al compartirse y reproducirse, otorga legitimidad a lo que el Estado hace y a lo que deja de hacer. El sentido común de la preparación cumple ahí una función precisa: traslada la gestión del riesgo al ciudadano que acude puntualmente al simulacro, y se la quita al Estado, que es quien debería llegar preparado a la emergencia.',
)

d.h(2, 'Los simulacros')
d.p(
  'Participar en los simulacros organizados por la entidad responsable de gestionar los riesgos de desastres{{fn:undrr}} en Perú, es un imperativo moral, una necesidad vital y una obligación civil. El ejercicio nos prepara para reaccionar de forma rápida y adecuada frente a un fenómeno natural como los terremotos, o ante multi-peligros (varios eventos de manera simultánea) que amenazan la tranquilidad social y económica. Nos capacita para organizarnos en casa, oficina, edificio de residencia o vecindad, nos recuerda cómo tener una mochila de supervivencia a la mano, cómo resguardarnos o abandonar con seguridad un edificio, cómo cumplir el deber de auxilio, dónde recurrir, cómo comunicarnos. El entrenamiento busca automatizar la respuesta de las personas, instituciones y sociedad en general.',
)
d.p(
  `Los simulacros son dirigidos, analizados y reportados por autoridades con alta visibilidad mediática, que preparan, dirigen y finalmente dan cuenta de las estimaciones: daño o destrucción de la infraestructura pública y privada, número de heridos, fallecidos, rescatados, equipos utilizados, viviendas afectadas. Lo que informan sin que cambie nada son las trabas administrativas y largos procedimientos burocráticos que impiden una respuesta rápida, oportuna y efectiva del Estado. [Los reportes post simulacro](${SBN}) se sustentan en el supuesto metodológico del *ceteris paribus*, que asume que todo el sistema burocrático está a disposición de la emergencia y que no existe nada que lo perturbe.`,
)
d.p(
  'Los simulacros y los relatos condicionan nuestras respuestas frente a una “realidad futura de destrucción”, que pondrá en riesgo la vida de las personas y destruirá activos públicos y privados. Ante esta ineluctable realidad es “esperable” que estemos organizados como individuos, colectividad y gobierno. Ese es el combustible que sostiene el sentido común que reclama la unión de todos.',
)

d.h(2, 'El sentido común')
d.p(
  'Los relatos se sostienen en publicaciones científicas y periodísticas, que, al difundirse académica y socialmente construyen percepciones colectivas, que nos advierten los impactos destructivos de eventos climáticos extremos (Lisanews, 2025). Frente a una ineluctable futura destrucción, es esperable la unión ciudadana, bajo el liderazgo de las autoridades políticas.',
)
d.p(
  'El sentido común{{fn:soto}} se nutre de mecanismos de recordación y afirmación que en ambos casos confirman el mensaje: “estamos expuestos a peligros y debemos prepararnos para enfrentarlos”. Se reproduce en los simulacros o en la conmemoración de eventos trágicos, como por ejemplo:',
)
d.bullet('La destrucción de la ciudad de [Valdivia](https://en.wikipedia.org/wiki/Valdivia) en Chile el 22 de mayo de 1960, a causa de un [terremoto](https://en.wikipedia.org/wiki/Earthquake) de magnitud 9,5 y posterior [tsunami](https://en.wikipedia.org/wiki/Tsunami);')
d.bullet('El terremoto y aluvión ocurrido el año 1970 en el Callejón de Huaylas en Perú;')
d.bullet(
  'La coincidencia de tres sismos sucedidos en Ciudad de México el mismo día en diferentes años: [el 19 de septiembre de 1985, 2017 y el 2022](https://heraldodemexico.com.mx/nacional/2026/9/17/los-sismos-del-19-de-septiembre-la-coincidencia-historica-de-tres-terremotos-la-misma-fecha-en-anos-distintos-889530.html).',
)
d.p(
  'El sentido común se adapta en el tiempo, “no es algo rígido e inmóvil, sino que se transforma continuamente, enriqueciéndose con nociones científicas y con opiniones filosóficas que entran en las costumbres” (Nun, 2020), cuando llega como saber científico, se “apoya en el lenguaje”{{fn:lyotard}}, en la construcción de relatos que legitiman la ciencia (Lyotard 1991). Así aceptamos la teoría del llamado agujero de ozono, que crecía imparable por el incremento del uso de los clorofluorocarbonos, a la teoría del cambio climático, ambas interconectadas, que se afectan mutuamente, en tanto tienen causas comunes, razón por la que no se puede negar que causan desajustes en el clima, muchas veces catastróficos; pero no se puede dejar de reconocer que el cambio climático es el único responsable.',
)

d.h(3, 'Mentes dóciles')
d.p(
  '¿Por qué aceptamos sin dudar la existencia de un futuro catastrófico?, ¿por qué estamos obligados a prepararnos para actuar en el futuro catastrófico?, y finalmente ¿por qué esperamos respuestas del Estado?. Primero, porque los informes, estudios, cuadros, gráficos y noticias en general nos aseguran que tarde o temprano enfrentaremos un desastre. Segundo porque la historia nos muestra una continuidad imparable de desastres. Tercero porque la magnitud del peligro exige respuestas organizadas. O tal vez, porque el sustento real del sentido común es maximizar el beneficio usando la menor cantidad de recursos posibles.',
)
d.p(
  'Hay cosas que, como afirma Kant, que no necesitan demostración. El *sensus communis*, no exige demostración ni argumentación, el saber colectivo se valida en la cotidianeidad por ejemplo: el parlamento se discute el interés del pueblo, las leyes son iguales para todos, un tratado internacional discutido por unos cuantos defiende la voluntad de todos, con estas verdades construimos el sentido común, que en realidad es un atajo para entender de manera sencilla y rápida situaciones complejas. Nos obligamos a ver en una sola dirección. El gobierno amparado en el sentido común, alcanza acuerdos políticos, toma decisiones, destina recursos, se enfrenta políticamente con grupos que tienen visiones diferentes de las respuestas, pero no de las causas, convirtiendo al peligro en un argumento de discusión política.',
)
d.p(
  'El sentido común afirma la responsabilidad ciudadana y diluye la del Estado. Cualquier error o resultado negativo se atribuye a la naturaleza cambiante e impredecible, porqué no, a la población desorganizada; pero de ninguna manera se responsabiliza a quienes deciden la política, y menos a quienes asignan y ejecutan los presupuestos.',
)
d.p(
  'No hay duda de que la tierra está permanentemente expuesta a peligros, explicados en documentadas investigaciones científicas y publicaciones mediáticas. Tampoco hay duda de que determinadas decisiones elevan los niveles de riesgo, características que le otorgan a este sentido común una base científica, no surge de “sentimientos espontáneos de las masas”; como menciona Gramsci, pero es también cierto, que muy poco se dice de la responsabilidad personal o institucional de las respuestas. Se incide en el sufrimiento por las pérdidas de vidas y viviendas, se celebran los aislados rescates aislados y las acciones excepcionales:, relatos que, sin ser el propósito, engordan al sentido común.',
)
d.p(
  'Cuando el sentido común falla por errores de control o la mala calidad de las respuestas, se cambia la organización, los protocolos, pero no el pensamiento que los rodea. Veamos unos ejemplos:',
)

d.h(3, '¿Y si el sentido común dejara de serlo?')
d.p(
  '¿Qué pasaría si todo lo que consideramos de sentido común no lo fuera? ¿Qué pasaría si empezamos a pensar que fabrica con un propósito? “Las personas optan a menudo por la ignorancia o la negación, cuando están cerca de descubrir algo insoportable{{fn:salecl}}”, agregaría que el rechazo se sustenta en el miedo, la costumbre o la inmovilidad del conocimiento. Nos cuesta cuestionar el sentido común, defendido por el interés de unos pocos y la indiferencia de muchos, extremos que ponen en entredicho a la libertad de buscar otras respuestas, desalentando así la capacidad de atreverse a pensar por uno mismo.',
)
d.bullet(
  'El 13 de noviembre de 1985, la erupción del [Volcán Nevado del Ruiz](https://es.wikipedia.org/wiki/Volc%C3%A1n_Nevado_del_Ruiz), destruyó la ciudad de Armero, en Colombia, unos meses después el país creó el Observatorio Vulcanológico y Sismológico de Manizales, dedicado exclusivamente a la vigilancia continua de volcanes. Posteriormente se crearon una veintena de observatorios en América Latina, el nuevo sentido común se extendió por todo el continente.',
)
d.bullet(
  'La fracasada respuesta de las autoridades de la ciudad de Valencia, frente a la Depresión Aislada a Niveles Altos (DANA), del 29 de octubre de 2024, que pudo evitar la destrucción de una amplia zona costera mediterránea del oeste de España y muchas muertes. El nuevo sentido común llevó a la comunidad a organizarse para rescatar a las víctimas y atender las emergencias.',
)

d.h(2, 'El sentido común traicionado')
d.p(
  'Las fallas en la gestión de desastres pocas veces se relacionan con los sistemas de administración pública, que tampoco escapan al control posterior. Pocas veces se critica la deficiente coordinación entre los distintos niveles de gobierno -central, regional y local-. Lo que siempre se deja en claro es la falta de recursos. Las posiciones de las autoridades de Estado y gobierno y de la oposición, como es de esperar, suelen ir en sentidos opuestos: el primero da cuenta del éxito absoluto o relativo de la intervención, los grupos opositores señalan las deficiencias que costaron vidas.',
)
d.p(
  'La lucha por el control político no tiene como propósito final demostrar qué grupo tiene o no la razón: es una lucha por imponer un relato que se convierta en nuevo sentido común. Las historias, de acuerdo con Harari{{fn:harari}}, son “la primera tecnología de información crucial desarrollada por los humanos, sentando las bases para la cooperación a gran escala, lo que permitió a los humanos convertirse en la especie más poderosa de la Tierra”, la lucha política es por imponer un relato, naturalizar una historia.',
)

d.h(3, 'Cambia todo, no cambia nada')
d.p(
  'El origen de la confrontación política, son las fallidas o inexistentes intervenciones de las agencias responsables de la gestión de riesgos, que por lo general concluyen con el cambio de los arreglos institucionales del gobierno. El Perú puede mostrar con claridad varios ejemplos (véase el suficiencia el resultado de estas luchas políticas ver Cuadro 1).',
)

d.p('Cuadro 1: Línea de tiempo y respuestas institucionales ante desastres: Perú 1950 – 2026', { styles: { bold: true } })
d.table(
  [
    ['Año / desastre', 'Zona afectada', 'Damnificados / afectados', 'Respuesta institucional que se creó o fortaleció', 'Daños estimados / Presupuesto público'],
    [
      '**1950 – Terremoto del Cusco**',
      'Cusco',
      '≈ 1,600 fallecidos; alrededor de la mitad de las viviendas de la ciudad destruidas',
      'Se creó la Junta de Reconstrucción del Cusco y posteriormente la Junta de Reconstrucción y Fomento Industrial (JRIF). En 1957 se creó la **Corporación de Reconstrucción y Fomento del Cusco** (CRIF), orientada no solo a reconstruir sino también a promover el desarrollo económico regional.',
      'Daños estimados en S/ 500 millones de 1950. La reconstrucción se financió, entre otros mecanismos, mediante un impuesto al tabaco. Para 1951-1956 se registra una inversión de aproximadamente S/ 537,5 millones de la época, destinados a la reconstrucción, crédito, fomento agrícola e industrial.',
    ],
    [
      '**1970 – Terremoto y aluvión de Áncash**',
      'Áncash, especialmente Huaraz, Yungay y el valle del Santa',
      '≈ 1 millón a 1,5 millones de damnificados; entre 50.000 y 67.000 fallecidos, 150.000 heridos.',
      'El desastre impulsó la creación de la **Defensa Civil** en el Perú en 1972, antecedente del actual sistema nacional de gestión del riesgo de desastres.',
      'Daños estimados: US$ 800 millones de la época. Esta cifra es costo del desastre, no necesariamente presupuesto estatal ejecutado.',
    ],
    [
      '**1982-1983 – Fenómeno El Niño**',
      'Principalmente norte del Perú, además de impactos en otras regiones',
      '≈ 1,9 millones de damnificados y 512 fallecidos, según registros utilizados por INDECI.',
      'El evento reforzó la necesidad de mecanismos permanentes para enfrentar El Niño, prevención de inundaciones y gestión de emergencias.',
      'Pérdidas estimadas: US$ 3.300 millones, equivalentes aproximadamente al 11,6% del PBI, según información del MEF.',
    ],
    [
      '**2001 – Terremoto del sur**',
      'Arequipa, Moquegua y Tacna',
      '≈ 31.000 damnificados en la estimación del MEF;',
      'Significó un importante fortalecimiento de los mecanismos de atención y reconstrucción dentro del entonces **SINADECI/INDECI.**',
      'Daños estimados en aproximadamente US$ 311 millones',
    ],
    [
      '**2007 – Terremoto de Pisco/Ica**',
      'Ica, Lima provincias y Huancavelica',
      'El MEF registró inicialmente 37.521 familias con viviendas destruidas, mientras que estimaciones posteriores del sistema de gestión del riesgo llegaron a cientos de miles de damnificados/afectados.',
      'Mediante la Ley 29078 se creó el **FORSUR** – Fondo para la Reconstrucción Integral de las Zonas Afectadas por los Sismos del 15 de agosto de 2007, adscrito a la PCM.',
      'El Gobierno autorizó S/ 100 millones para el Fondo para la Reconstrucción, S/ 20 millones para saneamiento, S/ 3 millones para INDECI y S/ 24,19 millones para alimentos, entre otras partidas. Para 2008 se previeron S/ 45 millones para rehabilitación y reconstrucción y hasta S/ 635 millones en la Reserva de Contingencia para desastres.',
    ],
    [
      '**2017 – Fenómeno El Niño Costero**',
      'Principalmente Piura, Lambayeque, La Libertad, Áncash, Tumbes, Lima e Ica, entre otras regiones',
      'Más de 1,5 millones de personas afectadas, según la memoria institucional de la ARCC.',
      'Se creó la **Autoridad para la Reconstrucción con Cambios (ARCC)** mediante la Ley 30556, con carácter excepcional y temporal, para dirigir la reconstrucción y ejecutar medidas de prevención en las regiones afectadas.',
      'El Gobierno anunció inicialmente US$ 6.500 millones para la Reconstrucción con Cambios. Posteriormente el Plan Integral de Reconstrucción llegó a manejar una inversión del orden de S/ 25.655 millones, incluyendo reconstrucción y prevención.',
    ],
    [
      '**2023 – lluvias intensas, ciclón Yaku y El Niño Costero**',
      'Norte y costa peruana, con impacto en varias regiones',
      'Cifras de afectados y damnificados variaron durante la emergencia y según el corte estadístico de INDECI/SINPAD.',
      'La respuesta institucional se desplazó hacia una estructura nacional de infraestructura, incluyendo la **Autoridad Nacional de Infraestructura (ANIN)**, creada en 2023 para desarrollar infraestructura de prevención y reconstrucción.',
      'Los recursos se canalizaron mediante modificaciones presupuestarias, reserva de contingencia y partidas de emergencia; el año 2024, el anion ejecutó más de 5 mil millones de soles.',
    ],
    [
      '**2026**',
      'Pronóstico catastrófico del Fenómeno del Niño',
      'Proyección catastrófica',
      'Crean **Comisión Nacional de Gestión del Riesgo del Fenómeno El Niño 2026-2027**\n1. Poder Ejecutivo (11 ago 2026): Comisión Nacional Multisectorial para liderar las decisiones políticas, la preparación y la respuesta\n2. Cámara de Senadores (09 sept 2026): Comisión Especial de Seguimiento, Prevención y Respuesta y la Gestión del Riesgo de Desastres\n3. Cámara de Diputados (10 sept 2026): Comisión especial multipartidaria encargada de realizar el seguimiento y la fiscalización de las acciones de prevención, preparación y respuesta.',
      'Presidente de la comisión del ejecutivo, informa la aprobación de un Decreto de Urgencia por 180 millones de soles y un Decreto Supremo por 450 millones soles para limpieza y descolmatación del cauce de los ríos',
    ],
  ],
  1,
  [100, 92, 118, 145, 145],
)

d.p(
  'Crear instituciones para la reconstrucción después de los desastres es, al parecer, una respuesta recurrente. Con el tiempo se las cuestiona por sus magros resultados, y ese cuestionamiento justifica crear una nueva institución, con la esperanza que atienda con eficiencia las tareas de siempre, dejando de lado el conocimiento acumulado y las metodologías de respuesta. En muchos casos se paralizan inversiones sobre las cuales nadie quiere asumir responsabilidad, se oscurecen las causas de las malas respuestas, se ilumina la atención en los cambios que llegarán más adelante.',
)
d.p(
  'El sentido común original no cambia, se fortalece: Más simulacros, y mochilas de emergencia. Todo para no ver la necesidad de ajustar o corregir las fallas de los sistemas administrativos, los modelos de asignación de recursos, la responsabilidad de las entidades que ofrecen servicios, el mantenimiento a los activos públicos, la mitigación y protección a la infraestructura expuesta, el cambio de modelos de comportamiento, o evitar decisiones que en el futuro incrementen el riesgo de desastres. Por el contrario, se insiste en priorizar intervenciones en obras nuevas bajo el argumento del “cierre de brechas”, se exige ejecutar presupuestos que se evalúan con la “eficiencia del gasto público”{{fn:pastor2025}}, dos conceptos que fortalecen el sentido común de inmovilidad{{fn:tesis}}.',
)
d.p(
  'Cada sociedad, cada país, puede mostrar experiencias positivas y negativas, en cualesquiera de las etapas del proceso de gestión de riesgos{{fn:esan}}: estimación, prevención, reducción, preparación, respuesta, rehabilitación, reconstrucción. Cada sociedad y cada grupo puede validar la calidad de la respuesta y participar activamente con propuestas de probado éxito para resguardar la vida y los activos públicos y privados.',
)
d.p(
  'El sentido común nos obliga a aceptar una línea argumentativa, que induce una respuesta condicionada por intereses diversos. Es un enfoque que limita la evaluación de las intervenciones públicas y, en muchos casos, privadas, con la esperanza que los cambios que la clase política propone serán la solución futura a problemas futuros.',
)

d.h(2, 'Referencias')
d.bullet(
  `Perú. Superintendencia Nacional de Bienes Estatales. Oficina de Administración y Finanzas. Informes de participación en los simulacros nacionales multipeligro 2025. Informes n.º 00503-2025, 00739-2025 y 00868-2025. San Isidro, 2025. [${SBN}](${SBN}).`,
)

const body = d.build()

async function main() {
  if (process.argv.includes('--dry')) {
    const out = process.env.DRAFT_DUMP
    if (!out) throw new Error('Set DRAFT_DUMP to the file that should receive the JSON')
    writeFileSync(out, JSON.stringify(body, null, 1))
    console.log(`wrote ${body.length} blocks to ${out}`)
    return
  }
  const saved = await saveDraft({
    title: 'El sentido común',
    excerpt: 'Los riesgos de desastres',
    authorId: ELSIE_ID,
    sourceLocale: 'es',
    body,
  })
  console.log('✓ draft created', saved)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
