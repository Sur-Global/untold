// Sharing is deliberately simple: copy the link, or send it by email.

/** The page address without tracking parameters or the #anchor: the address that gets shared */
export function cleanShareUrl(href: string): string {
  try {
    const url = new URL(href)
    return `${url.origin}${url.pathname}`
  } catch {
    return href
  }
}

/** "Send by email": opens the person's mail with the title as the subject and the link inside */
export function emailShareHref({ url, title }: { url: string; title: string }): string {
  return `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
}

/**
 * Puts a text in the clipboard. Where the browser does not allow the modern way (an old browser, an insecure page) it
 * tries the old one; false when neither worked, so the person can be shown the text to copy by hand.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // fall through to the old way
  }
  try {
    const box = document.createElement('textarea')
    box.value = text
    box.setAttribute('readonly', '')
    box.style.position = 'fixed'
    box.style.opacity = '0'
    document.body.appendChild(box)
    box.select()
    const ok = typeof document.execCommand === 'function' && document.execCommand('copy')
    document.body.removeChild(box)
    return !!ok
  } catch {
    return false
  }
}
