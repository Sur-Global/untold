import { translateOnVisit } from '@/lib/visit-translation'
import { TranslationRefresherClient } from './TranslationRefresherClient'

/**
 * Reloads the page once, 3 seconds after it opens, to pick up translations started by this visit.
 * While translating on visit is switched off (lib/visit-translation.ts) nothing is being translated,
 * so there is nothing to wait for.
 */
export function TranslationRefresher({ pending }: { pending: boolean }) {
  return <TranslationRefresherClient pending={pending && translateOnVisit()} />
}
