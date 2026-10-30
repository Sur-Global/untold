'use client'
import { useState } from 'react'
import { Link } from '@/i18n/navigation'

/** A creator's round photo (or their initial); with a profile it leads to the creator's page. */
export function AuthorAvatar({ name, avatarUrl, size = 32, slug }: { name?: string | null; avatarUrl?: string | null; size?: number; slug?: string | null }) {
  // A broken photo link falls back to the initial instead of a broken-image icon
  const [failed, setFailed] = useState(false)
  const avatar =
    avatarUrl && !failed ? (
      <img
        src={avatarUrl}
        alt={name ?? ''}
        onError={() => setFailed(true)}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: size, height: size, border: '1.5px solid rgba(169,168,233,0.4)' }}
      />
    ) : (
      <span
        className="rounded-full shrink-0 flex items-center justify-center text-white font-semibold"
        style={{
          width: size,
          height: size,
          background: '#A9A8E9',
          fontFamily: 'var(--font-aeonik), Aeonik, sans-serif',
          fontSize: size * 0.38,
          border: '1.5px solid rgba(212,165,116,0.6)',
        }}
      >
        {name?.charAt(0)?.toUpperCase() ?? '?'}
      </span>
    )
  // With a profile, the photo leads to the creator's page just like the name does
  return slug ? (
    <Link href={`/author/${slug}`} aria-label={name ?? undefined} className="shrink-0 rounded-full" style={{ textDecoration: 'none' }}>
      {avatar}
    </Link>
  ) : (
    avatar
  )
}
