import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'
// What the old Ghost site answered at (made by scripts/build-ghost-redirects.ts). Next only compiles this file, so the list is plain data.
import ghost from './lib/ghost-redirects.json'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const redirect = (source: string, destination: string) => ({ source, destination, permanent: true as const })

/**
 * Addresses the old Ghost site (untold.ink) answered at that are not at the same address on this platform.
 * Permanent (308), so search engines move their old results to the new addresses. Posts, tags and the page /about that keep
 * the same address need nothing. The posts were all written in Spanish, so they go to the Spanish version of the article.
 */
export function legacyRedirects() {
  return [
    // Ghost posts lived at /<slug>/ ; here they are articles
    ...ghost.posts.map((slug) => redirect(`/${slug}`, `/es/articles/${slug}`)),
    // tags whose address changed
    ...Object.entries(ghost.tags).map(([from, to]) => redirect(`/tag/${from}`, `/tag/${to}`)),
    // old pages of a list (Ghost numbered them: /tag/x/page/2/)
    redirect('/tag/:slug/page/:page', '/tag/:slug'),
    redirect('/author/:slug/page/:page', '/author/:slug'),
    redirect('/page/:page', '/articles'),
    // Ghost's own sitemaps (Search Console may still know them) → the one sitemap of this platform
    ...['posts', 'pages', 'tags', 'authors'].map((kind) => redirect(`/sitemap-${kind}.xml`, '/sitemap.xml')),
    // Ghost membership pages
    redirect('/subscribe', '/'),
    redirect('/signin', '/auth/login'),
    redirect('/signup', '/auth/signup'),
  ]
}

const nextConfig = {
  transpilePackages: ['@blocknote/core', '@blocknote/react', '@blocknote/mantine', '@blocknote/xl-multi-column', '@blocknote/xl-ai'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  async redirects() {
    return legacyRedirects()
  },
}

export default withNextIntl(nextConfig)
