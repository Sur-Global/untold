/** Only web addresses are allowed in a link or picture — never javascript:, data: or mailto: */
export function safeWebUrl(raw: unknown): string {
  const value = typeof raw === 'string' ? raw.trim() : ''
  return /^https?:\/\/[^\s]+$/i.test(value) && value.length <= 2000 ? value : ''
}
