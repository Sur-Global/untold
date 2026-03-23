import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig = {
  transpilePackages: ['@blocknote/core', '@blocknote/react', '@blocknote/mantine', '@blocknote/xl-multi-column'],
  // server-util uses JSDOM internally and must not be bundled
  serverExternalPackages: ['@blocknote/server-util', 'jsdom'],
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default withNextIntl(nextConfig)
