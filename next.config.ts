import createNextIntlPlugin from 'next-intl/plugin'
import path from 'path'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
}

export default withNextIntl(nextConfig)
