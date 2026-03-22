/**
 * Format a date string using the browser-native Intl.DateTimeFormat API,
 * respecting the user's locale.
 */
export function formatDate(
  dateStr: string,
  locale: string,
  options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric', year: 'numeric' }
): string {
  return new Intl.DateTimeFormat(locale, options).format(new Date(dateStr))
}

/**
 * Format a number as currency using the browser-native Intl.NumberFormat API.
 */
export function formatCurrency(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount)
}
