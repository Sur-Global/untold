'use client'

interface ShareButtonProps {
  title: string
  className?: string
}

export function ShareButton({ title, className }: ShareButtonProps) {
  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
  }

  return (
    <button onClick={handleShare} className={className} aria-label="Share article">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M15 13.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM5 7.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM15 1.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M12.5 3.5l-5 3M7.5 11.5l5 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      Share
    </button>
  )
}
