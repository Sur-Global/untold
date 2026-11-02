export interface FeedItem {
  title: string
  link: string
  summary: string | null
  publishedAt: string
  author: string | null
}

export interface Feed {
  title: string
  /** the site */
  link: string
  /** this feed's own address */
  selfLink: string
  description: string
  language: string
  items: FeedItem[]
}

const xml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/** An RSS 2.0 feed, which is what feed readers (and the old Ghost address /rss/) expect */
export function buildRss(feed: Feed): string {
  const items = feed.items
    .map(
      (i) => `    <item>
      <title>${xml(i.title)}</title>
      <link>${xml(i.link)}</link>
      <guid isPermaLink="true">${xml(i.link)}</guid>
      <pubDate>${new Date(i.publishedAt).toUTCString()}</pubDate>${i.author ? `\n      <dc:creator>${xml(i.author)}</dc:creator>` : ''}${i.summary ? `\n      <description>${xml(i.summary)}</description>` : ''}
    </item>`,
    )
    .join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${xml(feed.title)}</title>
    <link>${xml(feed.link)}</link>
    <description>${xml(feed.description)}</description>
    <language>${xml(feed.language)}</language>
    <atom:link href="${xml(feed.selfLink)}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`
}
