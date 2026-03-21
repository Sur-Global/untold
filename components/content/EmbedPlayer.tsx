'use client'
import { getEmbedUrl, getPlatformLabel } from '@/lib/embed'

interface EmbedPlayerProps {
  url: string
  title?: string
  aspectRatio?: '16/9' | '4/3' | '1/1'
}

export function EmbedPlayer({ url, title, aspectRatio = '16/9' }: EmbedPlayerProps) {
  const embedUrl = getEmbedUrl(url)
  const platform = getPlatformLabel(url)

  if (!embedUrl) {
    return (
      <div className="rounded-lg p-4 text-sm text-[#6B5F58]" style={{ background: 'rgba(44,36,32,0.04)', border: '1px solid rgba(139,69,19,0.12)' }}>
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-[#A0522D] hover:underline">
          Open on {platform} ↗
        </a>
      </div>
    )
  }

  // Spotify uses a fixed height; everything else 16/9
  const isSpotify = url.includes('spotify.com')
  const paddingMap = { '16/9': '56.25%', '4/3': '75%', '1/1': '100%' }
  const paddingBottom = isSpotify ? undefined : paddingMap[aspectRatio]

  if (isSpotify) {
    return (
      <iframe
        src={embedUrl}
        width="100%"
        height="232"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        title={title ?? platform}
        className="rounded-xl"
        style={{ border: 'none' }}
      />
    )
  }

  return (
    <div className="relative w-full rounded-xl overflow-hidden" style={{ paddingBottom }}>
      <iframe
        src={embedUrl}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        loading="lazy"
        title={title ?? platform}
        style={{ border: 'none' }}
      />
    </div>
  )
}
