import { Instagram, Linkedin, Link as LinkIcon } from 'lucide-react'

interface SocialLinksProps {
  bluesky?: string | null
  linkedin?: string | null
  instagram?: string | null
  medium?: string | null
  customUrl?: string | null
  className?: string
}

const iconLinkClass = 'flex items-center justify-center transition-opacity hover:opacity-70'

function BlueskyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 600 530" fill="currentColor" aria-hidden>
      <path d="M135.72 44.03C202.216 93.951 273.74 195.17 300 249.49c26.262-54.316 97.782-155.54 164.28-205.46C512.26 8.009 590-19.862 590 68.825c0 17.708-10.155 148.79-16.111 170.06-20.703 73.898-96.144 92.741-163.25 81.328 117.3 19.964 147.14 86.092 82.7 152.22-122.4 125.59-175.9-31.52-189.6-71.83-2.514-7.394-3.69-10.849-3.741-7.926-.051-2.923-1.227.532-3.741 7.926-13.7 40.31-67.2 197.42-189.6 71.83-64.44-66.128-34.6-132.256 82.7-152.22-67.106 11.413-142.55-7.43-163.25-81.328C10.155 217.615 0 86.533 0 68.825 0-19.862 77.74 8.009 135.72 44.03Z"/>
    </svg>
  )
}

function MediumIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 1043.63 592.71" fill="currentColor" aria-hidden>
      <path d="M588.67 296.36c0 163.67-131.78 296.35-294.33 296.35S0 460.03 0 296.36 131.78 0 294.34 0s294.33 132.69 294.33 296.36ZM911.56 296.36c0 154.06-65.89 279-147.17 279s-147.17-124.94-147.17-279 65.88-279 147.16-279 147.17 124.9 147.17 279M1043.63 296.36c0 138.02-23.17 249.94-51.76 249.94s-51.75-111.92-51.75-249.94 23.17-249.94 51.75-249.94 51.76 111.9 51.76 249.94Z"/>
    </svg>
  )
}

export function SocialLinks({ bluesky, linkedin, instagram, medium, customUrl, className }: SocialLinksProps) {
  const links = [
    bluesky && { href: bluesky, label: 'BlueSky', icon: <BlueskyIcon /> },
    linkedin && { href: linkedin, label: 'LinkedIn', icon: <Linkedin size={16} /> },
    instagram && { href: instagram, label: 'Instagram', icon: <Instagram size={16} /> },
    medium && { href: medium, label: 'Medium', icon: <MediumIcon /> },
    customUrl && { href: customUrl, label: 'Link', icon: <LinkIcon size={16} /> },
  ].filter(Boolean) as Array<{ href: string; label: string; icon: React.ReactNode }>

  if (links.length === 0) return null

  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          title={link.label}
          className={iconLinkClass}
          style={{ color: 'rgba(255,255,255,0.65)' }}
        >
          {link.icon}
        </a>
      ))}
    </div>
  )
}
