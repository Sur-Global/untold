/**
 * Draft: "Antes del Asfalto — Resiliencia climática para las urbanizaciones populares", by CAVI
 * (David Mora Torres and Román Bahena Cárdenas). Source: "V1 - Correcciones Resiliencia climática para las urbanizaciones populares.pdf".
 * Saved as a DRAFT (nothing is published). Photos are left as empty image slots with their captions: they are added from the editor.
 *
 * Run:  npx tsx --env-file=.env.local scripts/create-draft-cavi.ts          (creates it)
 *       DRAFT_DUMP=/path/file.json npx tsx --env-file=.env.local scripts/create-draft-cavi.ts --dry
 */
import { writeFileSync } from 'node:fs'
import { Draft, saveDraft } from './lib/draft-blocks'

// Elsie's own profile: the author is set from the editor (the authors do not have a profile yet)
const ELSIE_ID = 'a8e8b051-dd04-45f8-a68e-8cc37ff1000a'

const DRIVE = 'https://drive.google.com/file/d/1QoCgb2r-vlvDUEDvKwOjraU7t5yPOLeH/view'
const INEGI = 'https://www.inegi.org.mx/contenidos/productos/prod_serv/contenidos/espanol/bvinegi/productos/nueva_estruc/889463917663.pdf'
const VIMEO = 'https://vimeo.com/43394379'
const YOUTUBE = 'https://www.youtube.com/watch?v=sL1QqeqAsDs'

const d = new Draft()

d.p('Por: David Mora Torres y Román Bahena Cárdenas - Consultorio Arquitectónico Para Vivienda (CAVI)', { styles: { bold: true, italic: true } })
d.p(
  'Las colonias que todavía se están construyendo resisten mejor el calor, la lluvia y la sequía que las que ya tienen calles y drenaje. Dos arquitectos que trabajan en ellas explican qué se pierde cuando llega la ciudad formal, y qué se podría conservar.',
  { styles: { bold: true, italic: true } },
)
d.p('Para los que urbanizamos a pie: las ciudades ya fracasaron.', { styles: { bold: true, italic: true } })

d.p(
  'La urbanización emergente tiene mayor capacidad de resiliencia climática que la urbanización popular o consolidada. Para el presente artículo, se utilizan las referencias de investigación realizadas por CAVI, Consultorio Arquitectónico para Vivienda, HÁBITAT para la humanidad, documentales en formato video con lo que se busca transmitirlas palabras habladas o escritas de las personas y la conducta observable.',
)
d.p(
  '¿Cómo se puede hablar de resiliencia climática cuando una ciudad todavía se está construyendo? ¿Qué pasa en las colonias donde los propios pobladores construyen sus viviendas, abren calles, buscan agua y resuelven sus necesidades con los recursos que tienen?',
  { styles: { bold: true } },
)
d.p(
  'La resiliencia climática no se reduce a responder a los desastres cuando ocurren. El IPCC define la resiliencia como “la capacidad de los sistemas sociales, económicos y ambientales para afrontar un evento, tendencia o perturbación peligrosa, respondiendo o reorganizándose de modo que mantengan su función, identidad y estructura esenciales, y conserven además la capacidad de adaptación, aprendizaje y transformación”. En las ciudades, esta capacidad se pone a prueba: el riesgo derivado de los peligros climáticos ha aumentado en todas las áreas urbanas, y los daños en un sistema -como la infraestructura energética inundada- pueden reducir la resiliencia de otros y generar impactos en cadena. Por eso, hablar de resiliencia climática en el contexto urbano implica pensar la ciudad y su infraestructura como un conjunto, más allá de la vivienda.',
)
d.p(
  'Las observaciones que presentamos en este texto surgen del trabajo arquitectónico realizado directamente con pobladores de colonias populares, lo que nos ha permitido observar cómo se construyen y transforman las viviendas, cómo se resuelven las necesidades de infraestructura y cómo los pobladores enfrentan problemas relacionados con el agua, el calor, el frío, las inundaciones y los deslaves. No se trata solamente de observar cómo se construyen las colonias, sino de trabajar con quienes las construyen y transforman todos los días. Desde esta experiencia podemos identificar diferencias entre la urbanización emergente, la urbanización popular y la consolidación urbana, así como las posibilidades para incorporar estrategias de resiliencia climática.',
)
d.p(
  'Para entender este proceso es necesario hablar de urbanización. El INEGI la define como un “Proceso de transformación de una localidad o conjunto de localidades rurales, mediante la construcción de infraestructura de servicios (drenaje, agua potable, electrificación, pavimentación, transporte, etc.), este proceso se debe a la influencia cercana de alguna(s) ciudad(es).”',
)
d.p(
  'El INEGI señala que la consolidación urbana: “Es un proceso que se da principalmente en los asentamientos periféricos a los grandes centros de población, especialmente en los de carácter popular y/o de origen irregular. Dura varios años y en ocasiones, varios lustros, implicando en gran parte de los casos, la regularización de la tenencia de la tierra, así como la introducción y/o construcción diferida en el tiempo, de infraestructura y equipamiento urbanos, introducción de servicios y construcción paulatina de las viviendas”.',
)
d.p(
  'Para esta investigación entendemos la urbanización popular como el resultado de la consolidación de la urbanización emergente. Empieza con la necesidad de los pobladores de encontrar un lugar donde establecerse, construir una vivienda y hacer comunidad.',
)

d.p('Colonias Populares', { align: 'center', styles: { bold: true } })
d.imageSlot('Favela Rocinha (2026) Río de Janeiro')
d.imageSlot('Iztapalapa. Ciudad de México (2026)')
d.p('Fotografías por David Mora Torres en recorridos caminando.', { align: 'center' })

d.p(
  'La urbanización popular se caracteriza por la autoproducción y autoconstrucción de vivienda y su entorno, principalmente por sectores de bajos y medianos ingresos. Los pobladores participan como diseñadores, constructores y gestores, incorporando progresivamente servicios, infraestructura, vialidades y equipamiento urbano según sus necesidades y posibilidades económicas.',
)
d.p(
  'La urbanización emergente empieza con la lotificación del territorio y la construcción de una vivienda emergente que puede utilizar materiales nuevos o reciclados y estructuras temporales que se transforman según las necesidades sociales y climáticas. Puede surgir por catástrofes naturales o por migración urbana.',
)

d.p('Colonias emergentes al oriente de la Ciudad de México', { align: 'center', styles: { bold: true } })
d.imageSlot('Colonia El Pino (2026)')
d.imageSlot('Reyes La Paz (2026)')
d.p('Fotografías por David Mora Torres en recorridos caminando.', { align: 'center' })

d.p(
  'Las necesidades de la urbanización emergente más frecuentes son vialidades, transporte, comunicaciones, agua potable, drenaje y energía eléctrica. También enfrenta deslaves, inundaciones y fenómenos meteorológicos. Es urbanizada por sus pobladores con asistencia mínima de profesionales, de modo que carece de una planeación territorial que considere equipamiento urbano, vegetación, parques, zonas verdes y espacios públicos.',
)
d.p(
  'Es en esta etapa donde podemos orientar con mayor éxito el proceso de urbanización. Cuando la urbanización popular comienza a consolidarse, la construcción puede pasar de sistemas resilientes, flexibles y progresivos a sistemas constructivos de producción en serie, con menor posibilidad de modificación. Por eso es importante intervenir desde la urbanización emergente, antes de que la consolidación haga más difíciles las transformaciones.',
)

d.h(2, 'Resolver lo inmediato deja de lado lo importante')
d.p(
  'A partir del trabajo realizado en las colonias, haciendo un ejercicio de consultorio arquitectónico para la vivienda en colonias populares, podemos observar cómo los pobladores resuelven los problemas inmediatos de habitabilidad sin importar las consecuencias climáticas, se enfrentan de distintas maneras dependiendo de la etapa de urbanización.',
)

d.table(
  [
    ['Afectaciones', { text: 'Consecuencias climáticas', span: 3 }],
    ['Necesidades inmediatas', 'Urbanización emergente', 'Urbanización Popular', 'Consolidación Urbana'],
    [
      '**Desabasto de agua**',
      { text: 'Compra de pipas de agua o perforación de pozos provoca hundimientos en la ciudad y socavones cada vez más profundos dejando inestables las edificaciones', span: 2 },
      'Conexión insuficiente a la red de agua potable domiciliaria, provocando conexiones ilegales',
    ],
    ['**Calor**', 'Muros con materiales reciclados', 'Construcción con materiales industriales', 'Aires acondicionados de alto consumo eléctrico'],
    [
      '**Frío problema**',
      'Quema de basura que genera la contaminación del aire',
      'Quema de basura y calefactores eléctricos genera la contaminación del aire y sobreproducción de energía eléctrica',
      'Aires acondicionados de alto consumo eléctrico',
    ],
    [
      '**Inundaciones**',
      'Contención con costales de tierra, que no funciona como solución permanente',
      { text: 'Calles pavimentadas y red de drenaje pluvial/sanitario; la infraestructura puede colapsar por saturación', span: 2 },
    ],
    [
      '**Permeabilidad**',
      'Suelo natural permeable, pero sin recubrimiento, lo cual genera polvo',
      { text: 'Suelo sellado casi en su totalidad por asfalto, concreto y construcciones, reduciendo la infiltración del agua y contribuyendo al aumento de la temperatura del entorno', span: 2 },
    ],
    [
      '**Deslaves, derrumbes**',
      'Al construir en zonas de alto riesgo existe la posibilidad de las destrucciones de las edificaciones.',
      { text: 'Muros de contención de concreto armado con deterioro por falta de mantenimiento, pueden provocar que colapsen edificaciones y colonias con un alto índice de riesgo para sus pobladores', span: 2 },
    ],
    [
      '**Vivienda**',
      'Provoca la expansión de la ciudad, generando nuevos conflictos urbanos, no respeta zonas ecológicas y el entorno natural modificando las condiciones climáticas.',
      { text: 'Sumadas a la consecuencia de la invasión de la vivienda emergente son construidas con materiales fabricados en serie, los cuales no se adaptan a su entorno y su producción es altamente contaminante.', span: 2 },
    ],
    [
      '**Planeación Equipamiento urbano**',
      { text: 'Baja prioridad de espacios públicos y parques, ha provocado que los espacios verdes no se regeneren y en consecuencia existen pocas lluvias, altas concentraciones de polvo y contaminación aérea. No existen planes de reforestación.', span: 3 },
    ],
    [
      '**Falta de recolección de Basura**',
      'Principalmente provoca incendios.',
      'Como solución generan tiraderos cercanos y generan insectos, ratas y enfermedades.',
      'Generan sobre saturación de los tiraderos provocando su expansión a las orillas de las ciudades',
    ],
  ],
  2,
)
d.p('Tabla 1. Afectaciones climáticas por tipo de urbanización. Elaboración y síntesis para este artículo: Román Bahena Cárdenas y David Mora Torres.')

d.p(
  'En todas las etapas de la urbanización, los pobladores buscan resolver necesidades básicas como agua, electricidad, drenaje y recolección de basura. Sin embargo, persiste una pregunta fundamental: ¿cómo atender la problemática bioclimática? Ante ello, se propone implementar pequeñas soluciones resilientes desde la urbanización emergente.',
)

d.h(2, 'Soluciones resilientes de la urbanización emergente')
d.p(
  'En el caso de las colonias emergentes y populares, pueden incluir la reutilización de materiales de construcción, la conservación de superficies permeables para favorecer la absorción del agua pluvial, el almacenamiento de agua para emergencias y la adaptación progresiva de las viviendas a las condiciones climáticas. Estas acciones pueden complementarse con la organización y cooperación vecinal para atender contingencias, como los incendios.',
)
d.p(
  'El objetivo es que, conforme la colonia se consolide, no pierda su capacidad de adaptación al entorno. Por lo que hay que buscar integrar pequeñas soluciones bioclimáticas desde las primeras etapas de urbanización y conservarlas durante el crecimiento urbano, en lugar de esperar a que el asentamiento esté consolidado para atender los problemas ambientales.',
)
d.p(
  'La falta de pavimentación permite la absorción del agua al subsuelo, ayuda a conservar el nivel freático, reduce el riesgo de inundaciones, regula la temperatura de territorio (calor o frío) y respeta su ecosistema. Para reducir los efectos de la consolidación en las urbanizaciones populares y aumentar la resiliencia climática se propone intervenir desde la infraestructura vial. Una vez que los pavimentos se encuentren en mal estado, en lugar de aplicar una nueva carpeta asfáltica, se pueden utilizar suelos que permitan una mayor permeabilidad.',
)
d.p(
  'La vivienda emergente, aunque en principio puede parecer temporal, consigue adquirir un carácter permanente si está adecuadamente construida. Comienza con materiales reciclados como envases, plásticos, madera, troncos, cartón, láminas de acero, fibra de vidrio, piedra, block o tabiques. En general, cualquier material al alcance del poblador puede ser una opción para su construcción. Se caracteriza por no utilizar necesariamente concreto, varillas ni acero de refuerzo, lo que permite al poblador autoconstruirla y modificarla de acuerdo con sus necesidades.',
)
d.p(
  'Los pobladores de las colonias emergentes también desarrollan sistemas de reciclaje del agua: de agua potable a agua jabonosa y posteriormente a agua para uso sanitario. El agua pluvial se almacena en tambos, cisternas y pozos de absorción. El agua potable comprada por pipas generalmente tiene tres usos: primero, para bañarse, cocinar, lavar ropa y utensilios de cocina; después, para limpiar pisos, regar jardines y mojar tierra suelta para evitar el polvo; por último, para el sanitario. Al sustituir el drenaje por una fosa séptica se puede evitar la sobresaturación de las tuberías urbanas. Estas son algunas de las acciones de resiliencia climática que se pueden realizar en la urbanización popular y emergente. Son acciones pequeñas, pero a mayor escala pueden tener una gran importancia.',
)
d.p(
  'Los pobladores de las urbanizaciones emergentes han desarrollado mecanismos cotidianos para responder directamente a los problemas climáticos. Construyen vivienda con materiales reciclados, recuperan agua pluvial, resuelven sus necesidades de drenaje y aprovechan la permeabilidad del suelo cuando todavía no existen pavimentos.',
)
d.p(
  'La urbanización emergente también se distingue por la unión de sus pobladores para resolver las necesidades inmediatas. Genera comunidad, organización vecinal para la seguridad y la vigilancia, fondos económicos, seguridad dentro de las colonias y empleos que permiten sostener su sistema socioeconómico. Cuando inicia la consolidación urbana se pierde el sentido de comunidad y se generan diferencias de clase social.',
)
d.p(
  'La transformación de una urbanización emergente a una popular y posteriormente a una consolidada genera problemas urbanos que después son difíciles de revertir. A mayor grado de consolidación mediante materiales industrializados, mayor es la dificultad para transformar la vivienda y la infraestructura. Buscar un 0 % de emisiones es algo que nunca va a pasar, a menos que se deje de construir. Tampoco podemos frenar el crecimiento de los nuevos asentamientos emergentes. Lo que sí podemos hacer es buscar que estos crezcan de una manera más controlada, reducir las emisiones que producen y crear resiliencia frente al cambio climático.',
)
d.p(
  'Las nuevas formas de habitar deben responder al entorno cambiante en el que se encuentran y buscar que el impacto sobre el ambiente sea el menor posible. Las viviendas emergentes pueden ser una respuesta para generar resiliencia climática: crean lo esencial para las personas y pueden ajustarse tanto al contexto urbano como al poblador. La urbanización emergente transforma lo rural en urbano, hace crecer la ciudad y también puede generar deforestación, basura y pérdida de espacios naturales. El ciclo corresponde al sistema neoliberal que ha contribuido a la pérdida histórica y cultural y ha dirigido a la sociedad hacia el consumo.',
)
d.p(
  'Se cree que lo urbano implica obedecer el sistema de las ciudades, pero este es uno de los principales errores de la modernidad. El modelo urbano dominante obedece a una lógica que, para ser transformada, exige “revertir décadas de políticas de vivienda y planeación urbana que consolidan la desigualdad”. Como demuestra la observación en campo, la vivienda de interés social producida por inmobiliarias privadas y los megaproyectos infraestructurales “surgen de coyunturas políticas y económicas y no de ejercicios de planeación integral”, generando fragmentación en colonias populares y promoviendo desigualdad. Ya no hay vuelta atrás en la urbanización existente en los aspectos ambientales, pero sí podemos dejar de repetir los errores en las nuevas comunidades, respetando su identidad, historia y cultura.',
)
d.p(
  'Es innegable que todo proceso de urbanización genera algún grado de alteración en los ecosistemas desde sus etapas iniciales. Desde la perspectiva de los investigadores, cualquier intervención relacionada con el diseño y la construcción que modifique un ecosistema, desplace elementos de su entorno natural o incorpore componentes ajenos a su dinámica puede provocar alteraciones ecológicas y climáticas, algunas de ellas potencialmente irreversibles. En este sentido, se cuestiona la posibilidad de alcanzar un diseño bioclimático que no genere ningún impacto ambiental, puesto que toda intervención humana transforma, en mayor o menor medida, las condiciones del entorno. En palabras de Guillermo Amato, “El paisaje se puede cambiar y con él cambias el clima. Con el clima, de por sí, se recupera mucho de la calidad de vida”. Por lo tanto, el desafío no consiste en eliminar por completo el impacto de la urbanización, sino en reducirlo, evitar la degradación de los ecosistemas y preservar, en la medida de lo posible, sus procesos naturales.',
)

d.imageSlot('Síntesis gráfico del artículo. Antes del asfalto (2026). Autores: David Mora Torres y Román Bahena Cárdenas')

d.h(2, 'Nota metodológica')
d.p(
  'Las observaciones de este texto provienen del trabajo de campo de CAVI en colonias de la Ciudad de México y el Estado de México, con un enfoque cualitativo basado en la observación directa y en el registro de las palabras de los pobladores.',
  { styles: { italic: true } },
)

d.h(2, 'Referencias')
d.bullet(`Amato, Guillermo, dir. Hacer Ciudad (Ciudad de México). Con Amanda de la Garza y Hugo Royer. Vimeo, 2012 - [${VIMEO}](${VIMEO})`)
d.bullet(
  `González Acosta, Alfredo, y Pablo Landa Ruiloba. 2018. Tácticas de comunicación para movimientos de resistencia a megaproyectos. Trabajo colaborativo 3/5. Ciudad de México: Laboratorio para la Ciudad / El Centro del Espacio. [${DRIVE}](${DRIVE})`,
)
d.bullet(
  `Instituto Nacional de Estadística y Geografía, Ordenamiento territorial y desarrollo urbano: Glosario de términos básicos (Aguascalientes: INEGI, 2024), 125, ([enlace](${INEGI}))`,
)
d.bullet(
  `Landa Ruiloba, Pablo, y David Mora Torres. 2018. Cómo leer lo colectivo en el espacio construido. Trabajo colaborativo 2/5. Ciudad de México: Laboratorio para la Ciudad / El Centro del Espacio. [${DRIVE}](${DRIVE})`,
)
d.bullet(
  `Mora Torres, David, y CAVI. «Consultorio Arquitectónico para Vivienda, CAVI – Arquitecto en las colonias populares». Video de YouTube, 4 de marzo de 2023. [${YOUTUBE}](${YOUTUBE})`,
)
d.bullet('Taylor, S. J., & Bogdan, R. (1987). *Introducción a los métodos cualitativos de investigación: La búsqueda de significados*. Paidós.')

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
    title: 'Antes del Asfalto',
    excerpt: 'Resiliencia climática para las urbanizaciones populares',
    authorId: ELSIE_ID,
    sourceLocale: 'es',
    imageCredits: 'Fotografía: David Mora Torres y Jose Izmaya Zamora. Valle de Chalco 2026',
    body,
  })
  console.log('✓ draft created', saved)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
