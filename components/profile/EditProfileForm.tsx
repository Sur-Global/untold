'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { BlockNoteSchema } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { withMultiColumn } from '@blocknote/xl-multi-column'
import { updateProfile } from '@/lib/actions/profile'
import { slugify } from '@/lib/utils'
import { CoverImageInput } from '@/components/ui/CoverImageInput'
import { RichTextEditor, type EditorBlock } from '@/components/editor/RichTextEditor'

// Separate schema instance used only to convert the bio's blocks to HTML at
// submit time (mirrors components/content/BlockNoteReader.tsx) — bio stays a
// plain HTML string in the database, same as before, just now authored with
// the same block editor used for article bodies instead of a raw textarea.
const htmlConverterSchema = withMultiColumn(BlockNoteSchema.create())

interface EditProfileFormProps {
  userId: string
  initialDisplayName: string
  initialSlug: string
  initialBio: string
  initialLocation: string
  initialWebsite: string
  initialAvatarUrl: string
  initialEmail?: string
  initialSocialBluesky?: string
  initialSocialLinkedin?: string
  initialSocialInstagram?: string
  initialSocialMedium?: string
  initialSocialCustomUrl?: string
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
  initialEmail = '',
  initialSocialBluesky = '',
  initialSocialLinkedin = '',
  initialSocialInstagram = '',
  initialSocialMedium = '',
  initialSocialCustomUrl = '',
  isAdminEdit,
}: EditProfileFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const [displayName, setDisplayName] = useState(initialDisplayName)
  const [slug, setSlug] = useState(initialSlug)
  const [bioBlocks, setBioBlocks] = useState<EditorBlock[] | null>(null)
  const [location, setLocation] = useState(initialLocation)
  const [website, setWebsite] = useState(initialWebsite)
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl)
  const [email, setEmail] = useState(initialEmail)
  const [socialBluesky, setSocialBluesky] = useState(initialSocialBluesky)
  const [socialLinkedin, setSocialLinkedin] = useState(initialSocialLinkedin)
  const [socialInstagram, setSocialInstagram] = useState(initialSocialInstagram)
  const [socialMedium, setSocialMedium] = useState(initialSocialMedium)
  const [socialCustomUrl, setSocialCustomUrl] = useState(initialSocialCustomUrl)
  const slugManualRef = useRef(false)

  // Used only to serialize bioBlocks back to HTML on submit — bio is stored as
  // plain HTML, same as before the block editor was wired in.
  const htmlConverter = useCreateBlockNote({ schema: htmlConverterSchema })

  const handleDisplayNameChange = (val: string) => {
    setDisplayName(val)
    if (!slugManualRef.current) setSlug(slugify(val))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const bioHtml = bioBlocks ? htmlConverter.blocksToHTMLLossy(bioBlocks as any) : initialBio
    const fd = new FormData()
    fd.set('display_name', displayName)
    fd.set('slug', slug)
    fd.set('bio', bioHtml)
    fd.set('location', location)
    fd.set('website', website)
    fd.set('avatar_url', avatarUrl)
    fd.set('email', email)
    fd.set('social_bluesky', socialBluesky)
    fd.set('social_linkedin', socialLinkedin)
    fd.set('social_instagram', socialInstagram)
    fd.set('social_medium', socialMedium)
    fd.set('social_custom_url', socialCustomUrl)

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
        <label className={labelClass}>Bio</label>
        <RichTextEditor
          value={bioBlocks}
          onChange={setBioBlocks}
          initialHtml={initialBio}
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

      {/* Email (contact/display only — not the login email) */}
      <div>
        <label htmlFor="email" className={labelClass}>Contact Email</label>
        <input
          id="email"
          type="email"
          className={fieldClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          Shown to admins/editors only — not your login email, and not published on your public page.
        </p>
      </div>

      {/* Social links */}
      <div className="space-y-3 rounded-[10px] border border-primary/10 bg-muted/20 p-4">
        <p className={labelClass}>Social Links</p>
        <div>
          <label htmlFor="social_bluesky" className="mb-1 block text-xs text-muted-foreground">BlueSky</label>
          <input
            id="social_bluesky"
            type="url"
            className={fieldClass}
            value={socialBluesky}
            onChange={(e) => setSocialBluesky(e.target.value)}
            placeholder="https://bsky.app/profile/yourname"
          />
        </div>
        <div>
          <label htmlFor="social_linkedin" className="mb-1 block text-xs text-muted-foreground">LinkedIn</label>
          <input
            id="social_linkedin"
            type="url"
            className={fieldClass}
            value={socialLinkedin}
            onChange={(e) => setSocialLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/yourname"
          />
        </div>
        <div>
          <label htmlFor="social_instagram" className="mb-1 block text-xs text-muted-foreground">Instagram</label>
          <input
            id="social_instagram"
            type="url"
            className={fieldClass}
            value={socialInstagram}
            onChange={(e) => setSocialInstagram(e.target.value)}
            placeholder="https://instagram.com/yourname"
          />
        </div>
        <div>
          <label htmlFor="social_medium" className="mb-1 block text-xs text-muted-foreground">Medium</label>
          <input
            id="social_medium"
            type="url"
            className={fieldClass}
            value={socialMedium}
            onChange={(e) => setSocialMedium(e.target.value)}
            placeholder="https://medium.com/@yourname"
          />
        </div>
        <div>
          <label htmlFor="social_custom_url" className="mb-1 block text-xs text-muted-foreground">Custom link</label>
          <input
            id="social_custom_url"
            type="url"
            className={fieldClass}
            value={socialCustomUrl}
            onChange={(e) => setSocialCustomUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
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
