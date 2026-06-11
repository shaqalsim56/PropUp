import { supabase } from './supabase'

// Finds the existing (listing, student) conversation or creates a new one.
export async function findOrCreateConversation(params: {
  listingId: string
  studentId: string
  landlordId: string
}): Promise<{ id: string | null; error: string | null }> {
  const { listingId, studentId, landlordId } = params

  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (existing) return { id: existing.id, error: null }

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ listing_id: listingId, student_id: studentId, landlord_id: landlordId })
    .select('id')
    .single()

  if (error || !created) return { id: null, error: error?.message ?? 'Could not start conversation.' }
  return { id: created.id, error: null }
}
