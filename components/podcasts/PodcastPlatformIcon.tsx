import type { ComponentType } from 'react'
import { FaAmazon, FaDeezer, FaPodcast } from 'react-icons/fa6'
import { SiApplepodcasts, SiCastbox, SiPocketcasts, SiRss, SiSpotify, SiYoutube, SiYoutubemusic } from 'react-icons/si'
import type { PodcastPlatform } from '@/lib/podcast-banner'

type Icon = ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>

const ICONS: Record<PodcastPlatform, Icon> = {
  spotify: SiSpotify,
  apple: SiApplepodcasts,
  youtube: SiYoutube,
  ytmusic: SiYoutubemusic,
  amazon: FaAmazon,
  deezer: FaDeezer,
  pocketcasts: SiPocketcasts,
  castbox: SiCastbox,
  rss: SiRss,
}

/** The logo of a podcast platform (a generic podcast icon for any other) */
export function PodcastPlatformIcon({ platform, size = 22, className }: { platform: PodcastPlatform | null; size?: number; className?: string }) {
  const Icon = platform ? ICONS[platform] : FaPodcast
  return <Icon size={size} className={className} aria-hidden />
}
