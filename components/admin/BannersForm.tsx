'use client'

import { useState, useTransition } from 'react'
import { Megaphone } from 'lucide-react'
import { saveHomeBanners } from '@/lib/actions/home-banners'
import { BANNER_SLOTS, safeBannerLink, type BannerSlot, type HomeBanner, type HomeBanners } from '@/lib/home-banners'
import { AdBanner, type AdBannerCopy } from '@/components/home/AdBanner'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { AdminPanel } from '@/components/admin/AdminPanel'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { adminPrimaryButton } from '@/components/admin/admin-ui'

const SLOT_INFO: Record<BannerSlot, { title: string; where: string }> = {
  top: { title: 'Banner 1', where: 'Homepage, just before the Videos section' },
  bottom: { title: 'Banner 2', where: 'Homepage, just after the Knowledge Pills section' },
}

const fieldClass =
  'w-full rounded-lg border border-primary/20 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50'
const labelClass = 'mb-1 block text-xs font-medium text-muted-foreground'

interface Props {
  initial: HomeBanners
  copy: Record<BannerSlot, AdBannerCopy>
  houseLinks: Record<BannerSlot, string>
}

export function BannersForm({ initial, copy, houseLinks }: Props) {
  const [banners, setBanners] = useState<HomeBanners>(initial)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const update = (slot: BannerSlot, patch: Partial<HomeBanner>) =>
    setBanners((b) => ({ ...b, [slot]: { ...b[slot], ...patch } }))

  const save = () => {
    setMessage(null)
    startTransition(async () => {
      const result = await saveHomeBanners(banners)
      setMessage(result.ok ? { ok: true, text: 'Saved. The homepage is updated.' } : { ok: false, text: result.error })
    })
  }

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Advertising"
        description={
          <>
            The two wide banners on the homepage. Upload a picture and add the link people should go to when they click
            it. With no picture, UNTOLD’s own promo is shown instead. You can switch a banner off at any time.
          </>
        }
      >
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save banners'}
        </button>
      </AdminPageHeader>
      {message && (
        <p className={`text-sm ${message.ok ? 'text-secondary' : 'text-destructive'}`} role="status">
          {message.text}
        </p>
      )}

      {BANNER_SLOTS.map((slot) => {
        const banner = banners[slot]
        const linkProblem = banner.linkUrl.trim() !== '' && safeBannerLink(banner.linkUrl) === ''
        return (
          <AdminPanel key={slot}>
            <div className="flex items-start justify-between gap-4 border-b border-primary/10 px-6 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Megaphone className="h-4 w-4 text-primary" aria-hidden />
                  {SLOT_INFO[slot].title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{SLOT_INFO[slot].where}</p>
              </div>
              <label className="flex shrink-0 items-center gap-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={banner.enabled}
                  onChange={(e) => update(slot, { enabled: e.target.checked })}
                  className="size-4 rounded border-primary/30"
                />
                Show this banner
              </label>
            </div>

            <div className="grid gap-8 p-6 lg:grid-cols-2">
              <div className="space-y-5">
                <CoverImageInput
                  name={`${slot}-image`}
                  label="Banner picture"
                  uploadType="banner"
                  previewAspect="5/1"
                  sizeHint="Best: a wide picture, 2000 × 400 px (5:1). Put any text inside the picture itself."
                  defaultValue={banner.imageUrl}
                  onChange={(url) => update(slot, { imageUrl: url })}
                />
                <CoverImageInput
                  name={`${slot}-mobile-image`}
                  label="Picture for phones (optional)"
                  uploadType="banner"
                  previewAspect="2/1"
                  sizeHint="Best: 1000 × 500 px (2:1). Without it, phones show the wide picture smaller."
                  defaultValue={banner.mobileImageUrl}
                  onChange={(url) => update(slot, { mobileImageUrl: url })}
                />
              </div>

              <div className="space-y-5">
                <div>
                  <label htmlFor={`${slot}-link`} className={labelClass}>
                    Link — where a click goes
                  </label>
                  <input
                    id={`${slot}-link`}
                    className={fieldClass}
                    value={banner.linkUrl}
                    onChange={(e) => update(slot, { linkUrl: e.target.value })}
                    placeholder="https://brand.com/campaign   or   /courses"
                  />
                  {linkProblem ? (
                    <p className="mt-1 text-xs text-destructive">
                      This address is not valid. Start it with https:// (another site) or / (a page of UNTOLD).
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Opens in a new tab. Leave empty and the picture is not clickable
                      {!banner.imageUrl && ` (UNTOLD’s promo then goes to ${houseLinks[slot]})`}.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor={`${slot}-alt`} className={labelClass}>
                    Picture description (for people who cannot see it)
                  </label>
                  <input
                    id={`${slot}-alt`}
                    className={fieldClass}
                    value={banner.altText}
                    onChange={(e) => update(slot, { altText: e.target.value })}
                    placeholder="e.g. Brand X — 20% off for UNTOLD readers"
                  />
                </div>
                <div>
                  <label htmlFor={`${slot}-sponsor`} className={labelClass}>
                    Advertiser name (optional)
                  </label>
                  <input
                    id={`${slot}-sponsor`}
                    className={fieldClass}
                    value={banner.sponsor}
                    onChange={(e) => update(slot, { sponsor: e.target.value })}
                    placeholder="e.g. Brand X"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={banner.showLabel}
                    onChange={(e) => update(slot, { showLabel: e.target.checked })}
                    className="mt-0.5 size-4 rounded border-primary/30"
                  />
                  <span>
                    Show the small “Advertisement” label above the banner
                    <span className="block text-xs text-muted-foreground">
                      Turn this on for paid or third-party ads. Leave it off for UNTOLD’s own promotions.
                    </span>
                  </span>
                </label>
              </div>
            </div>

            <div className="border-t border-primary/10 bg-muted/30 px-6 py-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                Preview — how it looks on the homepage
              </p>
              {banner.enabled ? (
                <AdBanner banner={banner} slot={slot} copy={copy[slot]} houseLink={houseLinks[slot]} />
              ) : (
                <p className="text-sm text-muted-foreground">This banner is switched off, so the homepage shows nothing here.</p>
              )}
            </div>
          </AdminPanel>
        )
      })}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={isPending} className={adminPrimaryButton}>
          {isPending ? 'Saving…' : 'Save banners'}
        </button>
      </div>
    </div>
  )
}
