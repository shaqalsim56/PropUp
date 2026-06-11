import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { LandlordStackParamList } from '../../navigation/types'
import { Listing, ListingPhoto } from '../../types/database.types'
import { formatPrice } from '../../utils/distance'

type Nav = NativeStackNavigationProp<LandlordStackParamList, 'MainTabs'>
type LandlordListing = Listing & { listing_photos: ListingPhoto[] }
type ViewMode = 'list' | 'map'

const DEFAULT_REGION: Region = { latitude: 17.997, longitude: -76.794, latitudeDelta: 0.06, longitudeDelta: 0.06 }

function photoUrl(listing: LandlordListing): string | null {
  const first = [...listing.listing_photos].sort((a, b) => a.order_index - b.order_index)[0]
  if (!first) return null
  return supabase.storage.from('listing-photos').getPublicUrl(first.storage_path).data.publicUrl
}

export default function DashboardScreen() {
  const { profile, session } = useAuth()
  const navigation = useNavigation<Nav>()
  const [listings, setListings] = useState<LandlordListing[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')

  const fetchListings = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('listings')
      .select('*, listing_photos(id, storage_path, order_index)')
      .eq('landlord_id', session.user.id)
      .order('created_at', { ascending: false })
    setListings((data ?? []) as LandlordListing[])
    setLoading(false)
  }, [session])

  useFocusEffect(useCallback(() => { fetchListings() }, [fetchListings]))

  const initialRegion: Region = listings[0]
    ? { latitude: listings[0].lat, longitude: listings[0].lng, latitudeDelta: 0.06, longitudeDelta: 0.06 }
    : DEFAULT_REGION

  function edit(id: string) {
    navigation.navigate('EditListing', { listingId: id })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Hi, {profile?.full_name?.split(' ')[0] ?? 'there'}</Text>
          <Text style={styles.subgreeting}>Manage your listings</Text>
        </View>
        {listings.length > 0 && (
          <View style={styles.toggle}>
            {(['list', 'map'] as ViewMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.toggleTab, viewMode === mode && styles.toggleTabActive]}
                onPress={() => setViewMode(mode)}
              >
                <Ionicons
                  name={mode === 'list' ? 'list' : 'map'}
                  size={18}
                  color={viewMode === mode ? Colors.white : Colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.green600} /></View>
      ) : listings.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="home-outline" size={32} color={Colors.green600} /></View>
          <Text style={styles.emptyTitle}>No listings yet</Text>
          <Text style={styles.emptyBody}>Create your first listing to start reaching students.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreateListing')} activeOpacity={0.85}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.emptyBtnText}>Create Listing</Text>
          </TouchableOpacity>
        </View>
      ) : viewMode === 'map' ? (
        <View style={{ flex: 1 }}>
          <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} initialRegion={initialRegion}>
            {listings.map(l => (
              <Marker key={l.id} coordinate={{ latitude: l.lat, longitude: l.lng }} onPress={() => edit(l.id)}>
                <View style={[styles.marker, !l.is_available && styles.markerOff]}>
                  <Text style={styles.markerText}>{`J$${Math.round(l.price_per_month / 1000)}k`}</Text>
                </View>
              </Marker>
            ))}
          </MapView>
        </View>
      ) : (
        <FlatList
          data={listings}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const uri = photoUrl(item)
            return (
              <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => edit(item.id)}>
                <View style={styles.cardImage}>
                  {uri
                    ? <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                    : <View style={[StyleSheet.absoluteFill, styles.cardImagePlaceholder]}><Ionicons name="home-outline" size={22} color={Colors.green600} /></View>}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardPrice}>{formatPrice(item.price_per_month)}</Text>
                  <View style={styles.cardMeta}>
                    <View style={[styles.statusPill, !item.is_available && styles.statusPillOff]}>
                      <Text style={[styles.statusText, !item.is_available && styles.statusTextOff]}>
                        {item.is_available ? 'Available' : 'Hidden'}
                      </Text>
                    </View>
                    <Text style={styles.cardBeds}>{item.bedrooms} bd · {item.bathrooms} ba</Text>
                    <Text style={styles.cardViews}>{item.view_count} views</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} style={{ alignSelf: 'center', marginRight: 10 }} />
              </TouchableOpacity>
            )
          }}
        />
      )}

      {listings.length > 0 && (
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('CreateListing')} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  greeting: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.black },
  subgreeting: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  toggle: { flexDirection: 'row', gap: 4, backgroundColor: Colors.bgSecondary, borderRadius: 12, padding: 3 },
  toggleTab: { width: 38, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  toggleTabActive: { backgroundColor: Colors.green600 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.black },
  emptyBody: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingHorizontal: 24, borderRadius: 26, backgroundColor: Colors.green600, marginTop: 12 },
  emptyBtnText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.white },

  marker: { backgroundColor: Colors.green600, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1.5, borderColor: Colors.white },
  markerOff: { backgroundColor: Colors.textTertiary },
  markerText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.white },

  list: { padding: 16, gap: 12 },
  card: { flexDirection: 'row', backgroundColor: Colors.bgPrimary, borderRadius: 14, overflow: 'hidden', borderWidth: 0.5, borderColor: Colors.borderLight },
  cardImage: { width: 100, backgroundColor: Colors.bgTertiary },
  cardImagePlaceholder: { backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1, padding: 12, gap: 3, justifyContent: 'center' },
  cardTitle: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.textPrimary },
  cardPrice: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  statusPill: { backgroundColor: Colors.green50, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillOff: { backgroundColor: Colors.bgTertiary },
  statusText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.green600 },
  statusTextOff: { color: Colors.textTertiary },
  cardBeds: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary },
  cardViews: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary },

  fab: {
    position: 'absolute', right: 20, bottom: 28, width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.green600, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
})
