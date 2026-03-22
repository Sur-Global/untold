'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CoverImageInput } from '@/components/ui/CoverImageInput'

export function CompleteProfileForm() {
  const t = useTranslations('auth')
  const te = useTranslations('errors')
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!/^[a-z0-9-]+$/.test(slug)) { setSlugError(te('slugInvalid')); return }
    setSlugError(null)
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ display_name: displayName, slug, avatar_url: avatarUrl || null })
      .eq('id', user.id) as { error: { code: string; message: string } | null }

    setLoading(false)
    if (error?.code === '23505') { setSlugError(te('slugTaken')); return }
    if (error) { setSlugError(error.message); return }
    router.push('/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="displayName">{t('displayNameLabel')}</Label>
        <Input id="displayName" value={displayName}
          onChange={(e) => { setDisplayName(e.target.value); setSlug(slugify(e.target.value)) }} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">{t('slugLabel')}</Label>
        <Input id="slug" value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase())} required />
        <p className="text-xs text-muted-foreground">
          {t('slugHint').replace('{slug}', slug || 'your-name')}
        </p>
        {slugError && <p className="text-sm text-red-600">{slugError}</p>}
      </div>
      <div className="space-y-2">
        <CoverImageInput
          name="avatar_url"
          uploadType="avatar"
          onChange={setAvatarUrl}
        />
      </div>
      <Button type="submit" disabled={loading} className="w-full gradient-rust text-white border-0">
        {loading ? '...' : t('saveProfile')}
      </Button>
    </form>
  )
}
