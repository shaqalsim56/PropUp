import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { ListingWithDetails } from '../types/database.types'

export function useListings() {
  const [listings, setListings] = useState<ListingWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('listings')
      .select('*, listing_photos(id, storage_path, order_index), profiles(full_name, phone)')
      .eq('is_available', true)
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setListings((data ?? []) as ListingWithDetails[])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { listings, loading, error, refetch: fetch }
}
