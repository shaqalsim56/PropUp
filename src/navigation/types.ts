export type AuthStackParamList = {
  Welcome: undefined
  StudentSignUp: undefined
  LandlordSignUp: undefined
  Login: undefined
}

export type StudentStackParamList = {
  MainTabs: undefined
  ListingDetail: { listingId: string }
}

export type StudentTabParamList = {
  Home: undefined
  Events: undefined
  Saved: undefined
  Profile: undefined
}

export type LandlordStackParamList = {
  Dashboard: undefined
}
