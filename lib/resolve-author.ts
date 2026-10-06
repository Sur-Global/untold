import { isEditorRole } from '@/lib/require-editor'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The author an admin/editor explicitly asked for via `author_id`, or null if
 * none was requested / it's invalid / the caller isn't an admin or editor.
 * Use on edit paths, where "not provided" must mean "leave the author alone".
 */
export async function requestedAuthorId(
  supabase: any,
  formData: FormData,
  role: string | null | undefined,
): Promise<string | null> {
  if (!isEditorRole(role as any)) return null
  const requested = (formData.get('author_id') as string | null)?.trim()
  if (!requested || !UUID_RE.test(requested)) return null

  const { data } = await supabase.from('profiles').select('id').eq('id', requested).maybeSingle()
  return data?.id ?? null
}

/**
 * Who a newly created piece of content is attributed to: the author an
 * admin/editor picked, otherwise the current user.
 */
export async function resolveAuthorId(
  supabase: any,
  formData: FormData,
  user: { id: string },
  role: string | null | undefined,
): Promise<string> {
  return (await requestedAuthorId(supabase, formData, role)) ?? user.id
}
