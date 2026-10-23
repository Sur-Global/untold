/**
 * Titles imported from YouTube, Vimeo or Ghost often wrap words in quotation marks, which does not work well
 * for our titles, so imports drop them (straight, curly, angle and low-9 double quotes). Apostrophes stay.
 */
export function cleanImportedTitle(title: string): string {
  return title.replace(/[“”„‟«»"]/g, '').replace(/\s{2,}/g, ' ').trim()
}
