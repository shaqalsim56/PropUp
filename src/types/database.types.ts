export type UserRole = 'student' | 'landlord' | 'promoter'

export interface Profile {
  id: string
  role: UserRole
  full_name: string
  phone: string | null
  university: string | null
  campus_lat: number | null
  campus_lng: number | null
  student_id_url: string | null
  verification_status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
  updated_at: string
}

export interface Listing {
  id: string
  landlord_id: string
  title: string
  description: string | null
  price_per_month: number
  bedrooms: number
  bathrooms: number
  lat: number
  lng: number
  address: string | null
  is_available: boolean
  view_count: number
  created_at: string
  updated_at: string
}

export interface ListingPhoto {
  id: string
  listing_id: string
  storage_path: string
  order_index: number
  created_at: string
}

export interface SavedListing {
  id: string
  student_id: string
  listing_id: string
  created_at: string
}

export interface ListingView {
  id: string
  listing_id: string
  student_id: string | null
  viewed_at: string
}

export interface ListingWithDetails extends Listing {
  listing_photos: ListingPhoto[]
  profiles: Pick<Profile, 'full_name' | 'phone'>
}

export interface Conversation {
  id: string
  listing_id: string
  student_id: string
  landlord_id: string
  created_at: string
  last_message_at: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  created_at: string
}

export interface ConversationWithDetails extends Conversation {
  listings: Pick<Listing, 'title'> | null
  student: Pick<Profile, 'full_name'> | null
  landlord: Pick<Profile, 'full_name'> | null
}
