/**
 * Should opening a page in a language it has not been translated into send it to DeepL?
 *
 * OFF since 2026-11-24. When DeepL's free monthly quota refilled on ~2026-11-22, search-engine bots opening
 * untranslated pages at night spent all 500,000 characters in about 8 hours, on whichever articles they
 * happened to visit, and published unreviewed machine translations of articles that are meant to be
 * translated by hand after the Spanish has been checked.
 *
 * While it is off, a page without a finished translation shows its original language with the
 * "Only in …" label, listings show the original titles, and nothing is sent to DeepL. Translating on
 * purpose still works (Admin → translations, the hand-translation scripts).
 *
 * To switch it back on, set TRANSLATE_ON_VISIT=on in the environment (Vercel → Settings → Environment Variables).
 */
export function translateOnVisit(): boolean {
  return process.env.TRANSLATE_ON_VISIT === 'on'
}

/**
 * Should publishing send the new content to DeepL for every language?
 *
 * OFF since 2026-11-24, by Elsie's decision: new articles are translated by hand (by Claude, with the
 * scripts in scripts/), not by DeepL. Until a hand translation is saved, readers in other languages see
 * the original with the "Only in …" label. The "Translate" button in Admin still asks DeepL on purpose.
 *
 * To switch it back on, set TRANSLATE_ON_PUBLISH=on in the environment.
 */
export function translateOnPublish(): boolean {
  return process.env.TRANSLATE_ON_PUBLISH === 'on'
}
