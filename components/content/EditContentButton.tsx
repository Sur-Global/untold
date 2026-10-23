import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { canEditContent } from '@/lib/can-edit-content'
import { getEditPath } from '@/lib/utils'
import type { ContentType } from '@/lib/supabase/types'

/** "Edit" shortcut on a content page, for admins, editors and the author of the content. Nothing for anyone else. */
export async function EditContentButton({
  type, contentId, authorId, userId, role, className,
}: {
  type: ContentType
  contentId: string
  authorId?: string | null
  userId?: string | null
  role?: string | null
  className?: string
}) {
  if (!canEditContent({ userId, role, authorId })) return null
  const t = await getTranslations('content')
  return (
    <Link href={getEditPath(type, contentId)} className={className}>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
        <path d="M9.5 1.5a1.414 1.414 0 012 2L4 11l-3 1 1-3 7.5-7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {t('edit')}
    </Link>
  )
}
