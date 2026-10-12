// "I take responsibility for my content": a creator confirms it before publishing, and the server
// records when. Publishing a draft is refused until it has been confirmed once.

export function readDeclaration(formData: FormData): boolean {
  return formData.get('responsibility_confirmed') === 'true'
}

/** Records the confirmation time the first time the box is ticked */
export async function recordDeclaration(supabase: any, contentId: string, formData: FormData): Promise<void> {
  if (!readDeclaration(formData)) return
  await supabase
    .from('content')
    .update({ declaration_accepted_at: new Date().toISOString() })
    .eq('id', contentId)
    .is('declaration_accepted_at', null)
}

/** Call before publishing a draft: records a ticked box, then refuses if it was never confirmed */
export async function requireDeclaration(supabase: any, contentId: string, formData: FormData): Promise<void> {
  await recordDeclaration(supabase, contentId, formData)
  const { data } = await supabase.from('content').select('declaration_accepted_at').eq('id', contentId).single()
  if (!data?.declaration_accepted_at) {
    throw new Error('Please confirm the responsibility statement before publishing')
  }
}
