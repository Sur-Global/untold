import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['en', 'es', 'pt', 'fr', 'de', 'da'],
  defaultLocale: 'en',
  localePrefix: 'as-needed',
})
