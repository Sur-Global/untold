import { getLocale } from 'next-intl/server'
import { getTrendingTopics } from '@/lib/data/trending-topics'
import { NavigationClient } from '@/components/layout/NavigationClient'

type NavigationProps = Omit<React.ComponentProps<typeof NavigationClient>, 'topics'>

/** The top menu. The topics in "Explorar" are the most trending ones of the site (see lib/trending-topics.ts). */
export async function Navigation(props: NavigationProps) {
  const topics = await getTrendingTopics(await getLocale())
  return <NavigationClient {...props} topics={topics} />
}
