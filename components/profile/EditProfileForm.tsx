'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { updateProfile } from '@/lib/actions/profile'
import { slugify } from '@/lib/utils'
import { CoverImageInput } from '@/components/ui/CoverImageInput'

interface EditProfileFormProps {
  userId: string
  initialDisplayName: string
  initialSlug: string
  initialBio: string
  initialLocation: string
  initialWebsite: string
  initialAvatarUrl: string
  /** When true, redirects back to /admin/users after save */
  isAdminEdit?: boolean
}

const fieldClass =
  'w-full px-4 py-3 rounded-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground'
const labelClass = 'block text-sm font-semibold text-foreground mb-1.5'

export function EditProfileForm({
  userId,
  initialDisplayName,
  initialSlug,
  initialBio,
  initialLocation,
  initialWebsite,
  initialAvatarUrl,
  isAdminEdit,
}: EditProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [slug, setSlug] = useState(initialSlug)
  const [bio, setBio] = useState(initialBio)
  const [location, setLocation] = useState(initialLocation)
  const [website, setWebsite] = useState(initialWebsite)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const slugManualRef = useRef(false)

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val)
    if (!slugManualRef.current) setSlug(slugify(val))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const fd = new FormData()
    fd.set('display_name', displayName)
    fd.set('slug', slug)
    fd.set('bio', bio)
    fd.set('location', location)
    fd.set('website', website)
    fd.set('avatar_url', avatarUrl)

    startTransition(async () => {
      try {
        await updateProfile(userId, fd)
        setSuccess(true)
        if (isAdminEdit) router.push('/admin/users')
        else router.refresh()
      } catch (err: any) {
        setError(err.message ?? 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar */}
      <div className="space-y-1.5">
        <label className={labelClass}>Profile Photo</label>
        <CoverImageInput
          name="avatar_url"
          uploadType="avatar"
          defaultValue={avatarUrl}
          onChange={setAvatarUrl}
        />
      </div>

      {/* Display name */}
      <div>
        <label htmlFor="display_name" className={labelClass}>Display Name</label>
        <input
          id="display_name"
          className={fieldClass}
          value={displayName}
          onChange={(e) => handleDisplayNameChange(e.target.value)}
          required
          placeholder="Your Name"
        />
      </div>

      {/* Slug */}
      <div>
        <label htmlFor="slug" className={labelClass}>Profile URL slug</label>
        <div className="flex items-center gap-0">
          <span className="px-3 py-3 rounded-l-[10px] border border-r-0 border-primary/20 bg-muted text-muted-foreground text-sm select-none">
            /author/
          </span>
          <input
            id="slug"
            className="flex-1 px-4 py-3 rounded-r-[10px] border border-primary/20 bg-white text-foreground text-base outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground"
            value={slug}
            onChange={(e) => { slugManualRef.current = true; setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')) }}
            required
            placeholder="your-name"
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Lowercase letters, numbers and hyphens only.</p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className={labelClass}>Bio</label>
        <textarea
          id="bio"
          className={fieldClass}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="A short description of who you are…"
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className={labelClass}>Location</label>
        <input
          id="location"
          className={fieldClass}
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="City, Country"
        />
      </div>

      {/* Website */}
      <div>
        <label htmlFor="website" className={labelClass}>Website</label>
        <input
          id="website"
          type="url"
          className={fieldClass}
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yoursite.com"
        />
      </div>

      {error && (
        <p className="rounded-[10px] bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
      )}
      {success && !isAdminEdit && (
        <p className="rounded-[10px] bg-secondary/10 px-4 py-3 text-sm text-secondary">Profile saved.</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 rounded-[10px] bg-primary text-primary-foreground text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Profile'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2.5 rounded-[10px] border border-primary/20 text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
