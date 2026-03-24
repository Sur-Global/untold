'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Silently refreshes the current route once after a short delay when there are
 * content items whose translations were triggered in the background (via after()).
 * This ensures the listing updates as soon as the translated rows are written.
 */
export function TranslationRefresher({ pending }: { pending: boolean }) {
  const router = useRouter()

  useEffect(() => {
    if (!pending) return
    const timer = setTimeout(() => router.refresh(), 3000)
    return () => clearTimeout(timer)
  }, [pending, router])

  return null
}
