'use client'
import { useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
  { code: 'qu', label: 'Quechua' },
]

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/')
    const locales = LOCALES.map((l) => l.code)
    if (locales.includes(segments[1])) segments.splice(1, 1)
    const newPath = newLocale === 'en'
      ? segments.join('/') || '/'
      : `/${newLocale}${segments.join('/')}`
    router.push(newPath)
  }

  const current = LOCALES.find((l) => l.code === locale)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="font-mono text-xs uppercase px-3 py-1.5 hover:bg-accent hover:text-accent-foreground rounded-md transition-colors">
        {current?.code.toUpperCase()}
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
