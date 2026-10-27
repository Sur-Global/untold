import { describe, it, expect } from 'vitest'
import {
  MAX_INTRO_SESSIONS,
  audienceItems,
  courseTemplateBlocks,
  extrasFromMeta,
  extrasToColumns,
  formEmbedUrl,
  formatCourseDate,
  formatIntroSession,
  formatPrice,
  normalizeIntroSessions,
  normalizePeople,
  readCourseExtras,
  registrationTarget,
} from '@/lib/course-page'

const form = (fields: Record<string, string>) => {
  const fd = new FormData()
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe('normalizeIntroSessions', () => {
  it('keeps a valid date, with the time if it has one and the status (open by default), in date order', () => {
    expect(normalizeIntroSessions([{ date: '2026-02-19', time: '18:00', status: 'few' }, { date: '2026-02-12', time: '', status: 'bad' }])).toEqual([
      { date: '2026-02-12', time: '', status: 'open' },
      { date: '2026-02-19', time: '18:00', status: 'few' },
    ])
  })

  it('drops what has no valid date, keeps two at most and reads a JSON text', () => {
    expect(MAX_INTRO_SESSIONS).toBe(2)
    expect(normalizeIntroSessions([{ date: 'mañana' }, { date: '' }, null])).toEqual([])
    expect(normalizeIntroSessions(Array.from({ length: 4 }, (_, i) => ({ date: `2026-03-0${i + 1}` })))).toHaveLength(2)
    expect(normalizeIntroSessions('[{"date":"2026-03-05","time":"25:99"}]')).toEqual([{ date: '2026-03-05', time: '', status: 'open' }])
    expect(normalizeIntroSessions('not json')).toEqual([])
  })
})

describe('readCourseExtras (from the create/edit form)', () => {
  it('reads every field and cleans it', () => {
    const extras = readCourseExtras(form({
      banner_url: ' https://cdn/banner.webp ', modality: 'hybrid', place: '  Bogotá ', starts_on: '2027-03-12', language_label: 'Español', level: 'introductory', certificate: 'on',
      audience: '  Personas que lideran equipos  ', price_note: 'Becas disponibles', provider_name: 'Escuela breve de SurGlobal', provider_url: 'https://surglobal.io/escuela',
      registration_mode: 'embed', registration_url: 'https://tally.so/r/abc123', registration_label: 'Inscribirme', registration_note: 'Para las sesiones introductorias',
      intro_date_1: '2027-02-10', intro_time_1: '18:00', intro_status_1: 'open', intro_date_2: '2027-02-17', intro_time_2: '', intro_status_2: 'full', intro_timezone: 'Hora de Bogotá (GMT-5)',
    }))
    expect(extras).toMatchObject({
      bannerUrl: 'https://cdn/banner.webp', modality: 'hybrid', place: 'Bogotá', startsOn: '2027-03-12', languageLabel: 'Español', level: 'introductory', certificate: true,
      audience: 'Personas que lideran equipos', priceNote: 'Becas disponibles', providerName: 'Escuela breve de SurGlobal', providerUrl: 'https://surglobal.io/escuela',
      registrationMode: 'embed', registrationUrl: 'https://tally.so/r/abc123', introTimezone: 'Hora de Bogotá (GMT-5)',
    })
    expect(extras.introSessions).toEqual([{ date: '2027-02-10', time: '18:00', status: 'open' }, { date: '2027-02-17', time: '', status: 'full' }])
  })

  it('an empty form gives an empty page: nothing chosen, a button for the registration, no sessions, nobody listed', () => {
    expect(readCourseExtras(form({}))).toEqual({
      bannerUrl: '', bannerHasTitle: false, modality: '', place: '', startsOn: '', languageLabel: '', level: '', certificate: false, audience: '', priceNote: '', providerName: '', providerUrl: '',
      registrationMode: 'button', registrationUrl: '', registrationLabel: '', registrationNote: '', introSessions: [], introTimezone: '', people: [],
    })
  })

  it('never lets through an address that is not a web address, or a value that is not one of the choices', () => {
    const extras = readCourseExtras(form({ banner_url: 'javascript:alert(1)', provider_url: 'mailto:a@b.c', registration_url: 'data:text/html,x', modality: 'teleport', level: 'master', registration_mode: 'popup', starts_on: 'next week' }))
    expect(extras).toMatchObject({ bannerUrl: '', providerUrl: '', registrationUrl: '', modality: '', level: '', registrationMode: 'button', startsOn: '' })
  })
})

describe('extrasToColumns and extrasFromMeta', () => {
  it('go back and forth: what is saved is what is read, and empty texts are stored as nothing', () => {
    const extras = readCourseExtras(form({ place: 'Bogotá', registration_url: 'https://tally.so/r/abc', intro_date_1: '2027-02-10' }))
    const columns = extrasToColumns(extras)
    expect(columns).toMatchObject({ place: 'Bogotá', modality: null, banner_url: null, provider_name: null, registration_mode: 'button', certificate: false })
    expect(columns.intro_sessions).toEqual([{ date: '2027-02-10', time: '', status: 'open' }])
    expect(extrasFromMeta(columns)).toEqual(extras)
  })

  it('reads an old course (no extras) as an empty page', () => {
    expect(extrasFromMeta({ price: 0, currency: 'USD', duration: '6 semanas' }).introSessions).toEqual([])
    expect(extrasFromMeta(null).registrationMode).toBe('button')
  })
})

describe('formEmbedUrl', () => {
  it('turns a Tally link into its embedded form', () => {
    expect(formEmbedUrl('https://tally.so/r/abc123')).toBe('https://tally.so/embed/abc123?alignLeft=1&hideTitle=1&transparentBackground=1&dynamicHeight=1')
    expect(formEmbedUrl('https://tally.so/embed/abc123')).toContain('/embed/abc123')
  })

  it('embeds a Google form with ?embedded=true, and a Typeform, Airtable, Jotform or Microsoft form', () => {
    expect(formEmbedUrl('https://docs.google.com/forms/d/e/1FAIpQ/viewform')).toBe('https://docs.google.com/forms/d/e/1FAIpQ/viewform?embedded=true')
    expect(formEmbedUrl('https://surglobal.typeform.com/to/AbCdEf')).toBe('https://surglobal.typeform.com/to/AbCdEf')
    expect(formEmbedUrl('https://airtable.com/shrXyz123')).toBe('https://airtable.com/embed/shrXyz123')
    expect(formEmbedUrl('https://form.jotform.com/2412345')).toBe('https://form.jotform.com/2412345')
    expect(formEmbedUrl('https://forms.office.com/r/abc')).toBe('https://forms.office.com/r/abc?embed=true')
  })

  it('is null for anything else: another site, a short link, a plain page, something that is not https', () => {
    for (const bad of ['https://evil.example.com/form', 'https://forms.gle/abc', 'https://tally.so/', 'https://docs.google.com/document/d/1', 'http://tally.so/r/abc', 'javascript:alert(1)', '', 'nope']) {
      expect(formEmbedUrl(bad)).toBeNull()
    }
  })
})

describe('registrationTarget', () => {
  it('is nothing until the organisers give a form', () => {
    expect(registrationTarget({ registrationUrl: '', registrationMode: 'button' })).toBeNull()
  })
  it('a button goes to the form; the embedded mode also has the framed form', () => {
    expect(registrationTarget({ registrationUrl: 'https://tally.so/r/abc', registrationMode: 'button' })).toEqual({ href: 'https://tally.so/r/abc', embedUrl: null })
    expect(registrationTarget({ registrationUrl: 'https://tally.so/r/abc', registrationMode: 'embed' })?.embedUrl).toContain('tally.so/embed/abc')
  })
  it('the embedded mode falls back to the button when the form cannot be framed', () => {
    expect(registrationTarget({ registrationUrl: 'https://forms.gle/abc', registrationMode: 'embed' })).toEqual({ href: 'https://forms.gle/abc', embedUrl: null })
  })
})

describe('dates', () => {
  it('shows a session in the reader’s language', () => {
    expect(formatIntroSession({ date: '2027-02-11', time: '18:00', status: 'open' }, 'es')).toEqual({ day: 'jueves, 11 de febrero', time: '18:00' })
    expect(formatIntroSession({ date: '2027-02-11', time: '', status: 'open' }, 'en').day).toBe('Thursday, February 11')
  })
  it('shows the day classes start, and nothing for a bad date', () => {
    expect(formatCourseDate('2027-03-12', 'es')).toBe('12 de marzo de 2027')
    expect(formatCourseDate('', 'es')).toBe('')
  })
})

describe('courseTemplateBlocks', () => {
  it('is a heading and an empty paragraph for each section', () => {
    const blocks = courseTemplateBlocks(['Qué aprenderás', 'Programa'])
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'heading', 'paragraph'])
    expect(blocks[0].content[0].text).toBe('Qué aprenderás')
    expect(blocks[0].props.level).toBe(2)
  })
})

describe('audienceItems', () => {
  it('is one idea per line, without bullets or numbers, and no empty lines', () => {
    expect(audienceItems('Personas que lideran equipos\n\n- Quienes diseñan políticas\n2. Estudiantes avanzados\n• Emprendedoras')).toEqual([
      'Personas que lideran equipos', 'Quienes diseñan políticas', 'Estudiantes avanzados', 'Emprendedoras',
    ])
    expect(audienceItems('   ')).toEqual([])
  })
})

describe('formatPrice', () => {
  it('writes the price in the reader’s language, and nothing for a free course', () => {
    expect(formatPrice(180, 'USD', 'en')).toBe('$180')
    expect(formatPrice(49.5, 'EUR', 'es')).toMatch(/49,50/)
    expect(formatPrice(0, 'USD', 'es')).toBeNull()
    expect(formatPrice(null, 'USD', 'es')).toBeNull()
  })
  it('copes with a currency that does not exist', () => {
    expect(formatPrice(20, 'XX1', 'es')).toBe('XX1 20')
  })
})

describe('normalizePeople (teachers and SurGlobal facilitators)', () => {
  const person = (group: string, name: string, extra: Record<string, unknown> = {}) => ({ group, name, role: '', bio: '', photoUrl: '', linkUrl: '', ...extra })

  it('keeps at most four teachers and two facilitators, teachers first, each group in the order given', () => {
    const list = [
      person('facilitator', 'F1'), person('teacher', 'T1'), person('teacher', 'T2'), person('facilitator', 'F2'),
      person('teacher', 'T3'), person('teacher', 'T4'), person('teacher', 'T5'), person('facilitator', 'F3'),
    ]
    expect(normalizePeople(list).map((p) => p.name)).toEqual(['T1', 'T2', 'T3', 'T4', 'F1', 'F2'])
  })

  it('drops people without a name or with an unknown group, and cleans the texts and the web addresses', () => {
    const [only, ...rest] = normalizePeople([
      person('teacher', '  Ana Pérez  ', { role: ' Docente ', bio: 'x'.repeat(900), photoUrl: 'https://cdn.test/ana.webp', linkUrl: 'javascript:alert(1)' }),
      person('teacher', '   '),
      person('guest', 'Nobody'),
      null,
    ])
    expect(rest).toEqual([])
    expect(only).toMatchObject({ group: 'teacher', name: 'Ana Pérez', role: 'Docente', photoUrl: 'https://cdn.test/ana.webp', linkUrl: '' })
    expect(only.bio).toHaveLength(500)
  })

  it('reads the JSON of the form, the stored columns and nonsense', () => {
    expect(normalizePeople(JSON.stringify([person('facilitator', 'Luz')]))).toHaveLength(1)
    expect(normalizePeople([{ group: 'teacher', name: 'Rui', photo_url: 'https://cdn.test/r.webp', link_url: 'https://rui.example' }])[0]).toMatchObject({ photoUrl: 'https://cdn.test/r.webp', linkUrl: 'https://rui.example' })
    expect(normalizePeople('not json')).toEqual([])
    expect(normalizePeople(null)).toEqual([])
  })

  it('goes from the form to the columns and back', () => {
    const extras = readCourseExtras(form({ people_json: JSON.stringify([person('teacher', 'Ana', { linkUrl: 'https://ana.example' }), person('facilitator', 'Luz')]) }))
    const columns = extrasToColumns(extras)
    expect(columns.people).toEqual([
      { group: 'teacher', name: 'Ana', role: '', bio: '', photo_url: '', link_url: 'https://ana.example' },
      { group: 'facilitator', name: 'Luz', role: '', bio: '', photo_url: '', link_url: '' },
    ])
    expect(extrasFromMeta(columns).people).toEqual(extras.people)
    expect(extrasFromMeta({}).people).toEqual([])
  })
})

describe('bannerHasTitle (a designed banner that already carries the title)', () => {
  it('is off by default, and goes from the form to the column and back', () => {
    expect(readCourseExtras(form({})).bannerHasTitle).toBe(false)
    const extras = readCourseExtras(form({ banner_url: 'https://cdn.test/banner.webp', banner_has_title: 'on' }))
    expect(extras.bannerHasTitle).toBe(true)
    const columns = extrasToColumns(extras)
    expect(columns.banner_has_title).toBe(true)
    expect(extrasFromMeta(columns).bannerHasTitle).toBe(true)
    expect(extrasFromMeta({}).bannerHasTitle).toBe(false)
  })
})
