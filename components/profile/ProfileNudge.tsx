import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import { profileGaps } from '@/lib/profile-complete'

interface NudgeProfile {
  display_name?: string | null
  avatar_url?: string | null
  bio?: string | null
  website?: string | null
  social_bluesky?: string | null
  social_linkedin?: string | null
  social_instagram?: string | null
  social_medium?: string | null
  social_custom_url?: string | null
}

const hasText = (v: unknown) => typeof v === 'string' && v.replace(/<[^>]*>/g, '').trim().length > 0

/** Encourages creators to complete their public profile (photo, bio, links). Renders nothing when complete. */
export async function ProfileNudge({ profile, loginEmail }: { profile: NudgeProfile | null; loginEmail?: string | null }) {
  const t = await getTranslations('dashboard')

  // Photo and real name are needed to publish; the rest is only recommended
  const required = profileGaps(profile, loginEmail).map((gap) => (gap === 'photo' ? t('nudgePhoto') : t('nudgeName')))
  const missing: string[] = []
  if (!hasText(profile?.bio)) missing.push(t('nudgeBio'))
  const links = [
    profile?.website,
    profile?.social_bluesky,
    profile?.social_linkedin,
    profile?.social_instagram,
    profile?.social_medium,
    profile?.social_custom_url,
  ]
  if (!links.some(hasText)) missing.push(t('nudgeLinks'))
  if (required.length === 0 && missing.length === 0) return null

  return (
    <div
      className="mb-6 rounded-xl p-5"
      style={{ border: '1px solid rgba(169,168,233,0.6)', background: 'rgba(169,168,233,0.12)' }}
    >
      <p className="font-semibold">{t('profileNudgeTitle')}</p>
      <p className="mt-1 text-sm text-[#4b3a2a] leading-relaxed">{t('profileNudgeText')}</p>
      {required.length > 0 && (
        <p className="mt-2 text-sm font-semibold text-[#111]">{t('profileNudgeRequired', { items: required.join(', ') })}</p>
      )}
      {missing.length > 0 && <p className="mt-2 text-sm text-[#6B5F58]">{t('profileNudgeMissing', { items: missing.join(', ') })}</p>}
      <Link href="/dashboard/profile" className={cn(buttonVariants({ size: 'sm' }), 'mt-3')}>
        {t('profileNudgeCta')}
      </Link>
    </div>
  )
}
