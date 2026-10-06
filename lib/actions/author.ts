'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { requireEditor, isEditorRole } from '@/lib/require-editor'
import { slugify } from '@/lib/utils'
import { logActivity } from '@/lib/actions/activity-log'

export interface AuthorOption {
  id: string
  display_name: string
}

// Same convention as scripts/import-ghost-authors.ts: authors created on someone's
// behalf get an internal, non-deliverable login email and no password.
const AUTHOR_EMAIL_DOMAIN = 'authors.untold.ink'

/**
 * Authors an editor/admin can attribute content to. `canPick` is false for
 * everyone else, so the picker simply doesn't render for regular creators.
 */
export async function listAuthors(includeId?: string): Promise<{ canPick: boolean; me: string | null; authors: AuthorOption[] }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { canPick: false, me: null, authors: [] }

  const { data: profile } = await (supabase as any)
    .from('profiles').select('role').eq('id', user.id).single()
  if (!isEditorRole(profile?.role)) return { canPick: false, me: user.id, authors: [] }

  // Always include the current author (edit forms), even if their role is plain 'user'
  const safeInclude = includeId && /^[0-9a-f-]{36}$/i.test(includeId) ? includeId : null
  const query = (supabase as any).from('profiles').select('id, display_name')
  const { data } = await (safeInclude
    ? query.or(`role.in.(author,editor,admin),id.eq.${safeInclude}`)
    : query.in('role', ['author', 'editor', 'admin'])
  ).order('display_name', { ascending: true })

  return { canPick: true, me: user.id, authors: (data ?? []) as AuthorOption[] }
}

/** Creates a new author profile (editor/admin only) so content can be attributed to them right away. */
export async function createAuthor(displayName: string): Promise<AuthorOption> {
  await requireEditor()

  const name = displayName.trim()
  if (!name) throw new Error('Author name is required')
  if (name.length > 120) throw new Error('Author name is too long')

  const service = createServiceRoleClient()

  // Pick a free slug (/author/<slug>)
  const baseSlug = slugify(name) || 'author'
  let slug = baseSlug
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await (service as any)
      .from('profiles').select('id').eq('slug', slug).maybeSingle()
    if (!taken) break
    slug = `${baseSlug}-${i}`
  }

  const { data: created, error } = await service.auth.admin.createUser({
    email: `${slug}@${AUTHOR_EMAIL_DOMAIN}`,
    email_confirm: true,
    user_metadata: { display_name: name },
  })
  if (error || !created.user) throw new Error(error?.message ?? 'Could not create author')

  // The on-signup trigger already created a bare profile row — fill it in.
  const { error: profileError } = await (service as any)
    .from('profiles')
    .upsert({ id: created.user.id, slug, display_name: name, role: 'author' }, { onConflict: 'id' })
  if (profileError) throw new Error(profileError.message)

  await logActivity({
    entityType: 'user',
    entityId: created.user.id,
    entityLabel: name,
    action: 'author_created',
  })

  return { id: created.user.id, display_name: name }
}
