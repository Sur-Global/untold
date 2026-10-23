import { isEditorRole } from '@/lib/require-editor'

/** Admins and editors can edit any content; a creator can edit their own (same rule as the edit pages) */
export function canEditContent({ userId, role, authorId }: { userId?: string | null; role?: string | null; authorId?: string | null }): boolean {
  if (!userId) return false
  return isEditorRole(role as any) || (!!authorId && userId === authorId)
}
