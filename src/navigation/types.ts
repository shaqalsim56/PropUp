export type AuthStackParamList = {
  Welcome: undefined
  StudentSignUp: undefined
  LandlordSignUp: undefined
  Login: undefined
}

export type ChatParams = {
  conversationId: string
  headerTitle: string
}

export type StudentStackParamList = {
  MainTabs: undefined
  ListingDetail: { listingId: string }
  Chat: ChatParams
}

export type StudentTabParamList = {
  Home: undefined
  Saved: undefined
  Messages: undefined
  Profile: undefined
}

export type LandlordStackParamList = {
  MainTabs: undefined
  CreateListing: undefined
  EditListing: { listingId: string }
  Chat: ChatParams
}

export type LandlordTabParamList = {
  Listings: undefined
  Inquiries: undefined
  Profile: undefined
}
