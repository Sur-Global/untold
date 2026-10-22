'use client'

import { createContext, useContext } from 'react'
import { LANGUAGE_CATALOG } from '@/lib/languages'

const ALL = LANGUAGE_CATALOG.map((l) => l.code as string)
const EnabledLocalesContext = createContext<string[]>(ALL)

/** Gives client components (language menu, language pickers) the list of languages that are switched on. */
export function EnabledLocalesProvider({ locales, children }: { locales: string[]; children: React.ReactNode }) {
  return <EnabledLocalesContext.Provider value={locales}>{children}</EnabledLocalesContext.Provider>
}

export function useEnabledLocales(): string[] {
  return useContext(EnabledLocalesContext)
}
