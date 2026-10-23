// Links that share a page on the social networks, in the order they are shown. Instagram has no "share this
// link" address on the web (and neither have TikTok or WeChat): it only makes sense for content that is pictures
// (a carousel pill), whose button hands the slides over as pictures; everywhere else it is not offered.

export type ShareTarget = 'bluesky' | 'linkedin' | 'instagram' | 'whatsapp' | 'facebook' | 'telegram' | 'reddit' | 'threads' | 'x' | 'email'

/** `href` is null when the network has no web address for sharing (Instagram) */
export type ShareLink = { id: ShareTarget; label: string; href: string | null }

/** The page address without tracking parameters or the #anchor: the address that gets shared */
export function cleanShareUrl(href: string): string {
  try {
    const url = new URL(href)
    return `${url.origin}${url.pathname}`
  } catch {
    return href
  }
}

export function shareLinks({ url, title, emailLabel, instagram = false }: { url: string; title: string; emailLabel?: string; instagram?: boolean }): ShareLink[] {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const text = encodeURIComponent(`${title} ${url}`)
  const links: ShareLink[] = [
    { id: 'bluesky', label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${text}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'instagram', label: 'Instagram', href: null },
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'threads', label: 'Threads', href: `https://www.threads.net/intent/post?text=${text}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: 'email', label: emailLabel ?? 'Email', href: `mailto:?subject=${t}&body=${u}` },
  ]
  return instagram ? links : links.filter((link) => link.id !== 'instagram')
}
