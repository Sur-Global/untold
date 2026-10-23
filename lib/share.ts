// Links that share a page on the social networks people use most. Instagram, TikTok and WeChat have no
// "share this link" address on the web: on phones the "More options" button of the share menu opens the
// device's own share sheet, which includes them.

export type ShareTarget = 'whatsapp' | 'facebook' | 'x' | 'linkedin' | 'telegram' | 'reddit' | 'pinterest' | 'threads' | 'bluesky' | 'email'

export type ShareLink = { id: ShareTarget; label: string; href: string }

/** The page address without tracking parameters or the #anchor: the address that gets shared */
export function cleanShareUrl(href: string): string {
  try {
    const url = new URL(href)
    return `${url.origin}${url.pathname}`
  } catch {
    return href
  }
}

/** One link per network, in the order they are shown. Pinterest needs a picture, so it is left out without one. */
export function shareLinks({ url, title, image, emailLabel }: { url: string; title: string; image?: string | null; emailLabel?: string }): ShareLink[] {
  const u = encodeURIComponent(url)
  const t = encodeURIComponent(title)
  const text = encodeURIComponent(`${title} ${url}`)
  const links: ShareLink[] = [
    { id: 'whatsapp', label: 'WhatsApp', href: `https://wa.me/?text=${text}` },
    { id: 'facebook', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { id: 'x', label: 'X', href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: 'linkedin', label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { id: 'telegram', label: 'Telegram', href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: 'reddit', label: 'Reddit', href: `https://www.reddit.com/submit?url=${u}&title=${t}` },
    { id: 'threads', label: 'Threads', href: `https://www.threads.net/intent/post?text=${text}` },
    { id: 'bluesky', label: 'Bluesky', href: `https://bsky.app/intent/compose?text=${text}` },
  ]
  if (image) {
    links.splice(6, 0, {
      id: 'pinterest',
      label: 'Pinterest',
      href: `https://pinterest.com/pin/create/button/?url=${u}&media=${encodeURIComponent(image)}&description=${t}`,
    })
  }
  links.push({ id: 'email', label: emailLabel ?? 'Email', href: `mailto:?subject=${t}&body=${u}` })
  return links
}
