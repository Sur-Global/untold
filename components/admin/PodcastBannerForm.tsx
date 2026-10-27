'use client'

import { useState, useTransition } from 'react'
import { Mic } from 'lucide-react'
import { savePodcastBanner } from '@/lib/actions/podcast-banner'
import {
  OTHER_PLATFORM_SLOTS,
  PODCAST_PLATFORMS,
  PODCAST_PLATFORM_LABELS,
  normalizePodcastBanner,
  safeWebUrl,
  type OtherPlatform,
  type PodcastBanner as PodcastBannerSettings,
  type PodcastPlatform,
} from '@/lib/podcast-banner'
import { PodcastBanner, type PodcastBannerCopy } from '@/components/podcasts/PodcastBanner'
import { PodcastPlatformIcon } from '@/components/podcasts/PodcastPlatformIcon'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { adminPrimaryButton } from '@/components/admin/admin-ui'

const fieldClass =
  'w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

const withEmptySlots = (others: OtherPlatform[]): OtherPlatform[] =>
  Array.from({ length: OTHER_PLATFORM_SLOTS }, (_, i) => others[i] ?? { label: '', url: '' })

/** Admin → Advertising: the banner of SurGlobal / UNTOLD.ink's own podcast, on the podcasts page. */
export function PodcastBannerForm({ initial, copy }: { initial: PodcastBannerSettings; copy: PodcastBannerCopy }) {
  const [banner, setBanner] = useState<PodcastBannerSettings>({ ...initial, others: withEmptySlots(initial.others) })
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const setLink = (platform: PodcastPlatform, url: string) => setBanner((b) => ({ ...b, links: { ...b.links, [platform]: url } }))
  const setOther = (index: number, patch: Partial<OtherPlatform>) =>
    setBanner((b) => ({ ...b, others: b.others.map((o, i) => (i === index ? { ...o, ...patch } : o)) }))
  const invalid = (url: string) => url.trim() !== '' && safeWebUrl(url) === ''

  const save = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await savePodcastBanner(banner)
      setMessage(result.ok ? { ok: true, text: 'Saved. The podcasts page is updated.' } : { ok: false, text: result.error })
    })
  }

  return (
    <AdminPanel>
      <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Mic className="h-4 w-4 text-primary" aria-hidden />
            Banner 3 — our podcast
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Podcasts page, just below the podcasts made by SurGlobal / UNTOLD.ink. Upload the picture of the podcast and add the
            link of each platform where it can be heard: only the logos with a link are shown, each one clickable.
          </p>
        </div>
        <label className="flex shrink-0 items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={banner.enabled}
            onChange={(e) => setBanner((b) => ({ ...b, enabled: e.target.checked }))}
            className="size-4 rounded border-primary/30"
          />
          Show this banner
        </label>
      </div>

      <div className="grid gap-8 p-6 lg:grid-cols-2">
        <div className="space-y-5">
          <CoverImageInput
            name="podcast-banner-image"
            label="Banner picture"
            uploadType="banner"
            previewAspect="4/1"
            sizeHint="Best: a wide picture, 2000 × 500 px (4:1), with the name of the podcast and “a podcast by SurGlobal & UNTOLD.ink” inside the picture. Without a picture, a design in the brand colour with the name is shown."
            defaultValue={banner.imageUrl}
            onChange={(url) => setBanner((b) => ({ ...b, imageUrl: url }))}
          />
          <CoverImageInput
            name="podcast-banner-mobile-image"
            label="Picture for phones (optional)"
            uploadType="banner"
            previewAspect="2/1"
            sizeHint="Best: 1000 × 500 px (2:1). Without it, phones show the wide picture smaller."
            defaultValue={banner.mobileImageUrl}
            onChange={(url) => setBanner((b) => ({ ...b, mobileImageUrl: url }))}
          />
          <div>
            <label htmlFor="podcast-banner-alt" className={labelClass}>
              Picture description (for people who cannot see it)
            </label>
            <input
              id="podcast-banner-alt"
              className={fieldClass}
              value={banner.altText}
              onChange={(e) => setBanner((b) => ({ ...b, altText: e.target.value }))}
              placeholder="e.g. El Lado Incómodo de la Innovación — a podcast by SurGlobal & UNTOLD.ink"
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm font-medium text-foreground">Where to listen — a link for each platform</p>
          {PODCAST_PLATFORMS.map((platform) => (
            <div key={platform}>
              <label htmlFor={`podcast-banner-${platform}`} className={`${labelClass} flex items-center gap-2`}>
                <PodcastPlatformIcon platform={platform} size={16} className="text-foreground" />
                {PODCAST_PLATFORM_LABELS[platform]}
              </label>
              <input
                id={`podcast-banner-${platform}`}
                className={fieldClass}
                value={banner.links[platform]}
                onChange={(e) => setLink(platform, e.target.value)}
                placeholder="https://…"
              />
              {invalid(banner.links[platform]) && (
                <p className="mt-1 text-xs text-destructive">This address is not valid. Start it with https://</p>
              )}
            </div>
          ))}

          <p className="pt-2 text-sm font-medium text-foreground">Another platform (shown with its name)</p>
          {banner.others.map((other, index) => (
            <div key={index} className="grid grid-cols-[1fr_2fr] gap-2">
              <div>
                <label htmlFor={`podcast-banner-other-${index}-label`} className={labelClass}>
                  Name {index + 1}
                </label>
                <input
                  id={`podcast-banner-other-${index}-label`}
                  className={fieldClass}
                  value={other.label}
                  onChange={(e) => setOther(index, { label: e.target.value })}
                  placeholder="e.g. iVoox"
                />
              </div>
              <div>
                <label htmlFor={`podcast-banner-other-${index}-url`} className={labelClass}>
                  Link {index + 1}
                </label>
                <input
                  id={`podcast-banner-other-${index}-url`}
                  className={fieldClass}
                  value={other.url}
                  onChange={(e) => setOther(index, { url: e.target.value })}
                  placeholder="https://…"
                />
                {invalid(other.url) && <p className="mt-1 text-xs text-destructive">This address is not valid. Start it with https://</p>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-primary/10 bg-muted/30 px-6 py-5">
        <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">Preview — how it looks on the podcasts page</p>
        {banner.enabled ? (
          <PodcastBanner banner={normalizePodcastBanner(banner)} copy={copy} />
        ) : (
          <p className="text-sm text-muted-foreground">This banner is switched off, so the podcasts page shows nothing here.</p>
        )}
      </div>

      <div className="flex items-center justify-end gap-4 border-t border-primary/10 px-6 py-4">
        {message && (
          <p className={`text-sm ${message.ok ? 'text-secondary' : 'text-destructive'}`} role="status">
            {message.text}
          </p>
        )}
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save podcast banner'}
        </button>
      </div>
    </AdminPanel>
  )
}
