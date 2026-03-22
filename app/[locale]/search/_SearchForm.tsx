'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'

interface SearchFormProps {
  initialQuery: string
}

export function SearchForm({ initialQuery }: SearchFormProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('search')

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const q = (data.get('q') as string ?? '').trim()
    if (q) {
      router.push(`${pathname}?q=${encodeURIComponent(q)}`)
    } else {
      router.push(pathname)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 max-w-2xl">
      <input
        name="q"
        defaultValue={initialQuery}
        placeholder={t('placeholder')}
        className="flex-1 px-4 py-2 rounded-lg font-mono text-sm"
        style={{ background: '#FAF7F2', border: '1px solid rgba(139,69,19,0.2)', color: '#2C2420' }}
      />
      <button
        type="submit"
        className="px-6 py-2 rounded-lg font-mono text-sm font-semibold text-white"
        style={{ background: 'linear-gradient(135deg, #8B4513, #A0522D)' }}
      >
        {t('button')}
      </button>
    </form>
  )
}
