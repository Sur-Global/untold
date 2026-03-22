'use client'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from '@/i18n/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const LOCALES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'da', label: 'Dansk' },
]

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <ellipse cx="8" cy="8" rx="2.5" ry="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 8h12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M2.5 5.5h11M2.5 10.5h11" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
    </svg>
  )
}

interface LocaleSwitcherProps {
  /** compact = globe icon + uppercase code (for dark nav); default = full label pill */
  variant?: 'compact' | 'default'
}

export function LocaleSwitcher({ variant = 'default' }: LocaleSwitcherProps) {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    router.push(pathname as any, { locale: newLocale })
  }

  const current = LOCALES.find((l) => l.code === locale)

  const triggerStyle: React.CSSProperties = variant === 'compact'
    ? {
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
        letterSpacing: '0.06em',
        color: 'rgba(245,241,232,0.65)',
        background: 'none',
        border: 'none',
        outline: 'none',
        cursor: 'pointer',
      }
    : {
        background: '#f5f1e8',
        border: '1px solid rgba(139,69,19,0.2)',
        color: '#5a4a42',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 14,
        letterSpacing: '0.02em',
        outline: 'none',
      }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={
          variant === 'compact'
            ? 'flex items-center gap-1.5 transition-colors hover:text-white'
            : 'flex items-center gap-2 h-[38px] px-4 rounded-[10px] transition-opacity hover:opacity-80'
        }
        style={triggerStyle}
      >
        <GlobeIcon />
        {variant === 'compact'
          ? <span>{locale.toUpperCase()}</span>
          : <span>{current?.label ?? locale}</span>
        }
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {LOCALES.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => switchLocale(l.code)}
            className={l.code === locale ? 'font-semibold' : ''}
          >
            {l.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
