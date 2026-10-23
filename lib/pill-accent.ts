// The accent colours of a knowledge pill are the colours of the SurGlobal brand (Manual de Marca 2026):
// four primary ones and three secondary ones. Nothing else is offered, and nothing else is saved.

export const PILL_ACCENTS = [
  { value: '#000000', key: 'black' },
  { value: '#F1F1F1', key: 'offWhite' },
  { value: '#A1A1E9', key: 'lavender' },
  { value: '#D2FE73', key: 'lime' },
  { value: '#FF470D', key: 'orangeRed' },
  { value: '#FFEB55', key: 'yellow' },
  { value: '#9A3130', key: 'burgundy' },
] as const

export type PillAccentKey = (typeof PILL_ACCENTS)[number]['key']

/** Lavender, the colour of the text slides and of a pill that has not chosen one */
export const DEFAULT_PILL_ACCENT = '#A1A1E9'

/** A brand colour, whatever the case of what came in; anything else becomes the default */
export function normalizeAccent(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
  return PILL_ACCENTS.find((accent) => accent.value === value)?.value ?? DEFAULT_PILL_ACCENT
}
