import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pt', 'fr', 'de', 'da', 'qu'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
