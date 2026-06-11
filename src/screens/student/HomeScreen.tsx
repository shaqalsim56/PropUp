import { useState, useRef, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, Image, ScrollView, ActivityIndicator,
} from 'react-native'
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../context/AuthContext'
import { useListings } from '../../hooks/useListings'
import { supabase } from '../../lib/supabase'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { StudentStackParamList } from '../../navigation/types'
import { ListingWithDetails } from '../../types/database.types'
import { haversineKm, formatDistance, formatPrice } from '../../utils/distance'
import StudentIdModal from '../../components/StudentIdModal'

// ─── Kingston, Jamaica default coords ──────────────────────
const DEFAULT_LAT = 17.997
const DEFAULT_LNG = -76.794

type ViewMode = 'map' | 'list'
type Nav = NativeStackNavigationProp<StudentStackParamList>

interface Filters {
  maxPrice: string
  bedrooms: number | null   // null = any
}

function getPhotoUrl(listing: ListingWithDetails): string | null {
  const first = listing.listing_photos?.sort((a, b) => a.order_index - b.order_index)[0]
  if (!first) return null
  return supabase.storage.from('listing-photos').getPublicUrl(first.storage_path).data.publicUrl
}

// ─── Listing card (used in list view + map bottom card) ─────
function ListingCard({
  listing, distance, onPress, compact = false,
}: {
  listing: ListingWithDetails
  distance: number
  onPress: () => void
  compact?: boolean
}) {
  const photoUrl = getPhotoUrl(listing)

  return (
    <TouchableOpacity style={[styles.card, compact && styles.cardCompact]} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardImage, compact && styles.cardImageCompact]}>
        {photoUrl
          ? <Image source={{ uri: photoUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="home-outline" size={compact ? 18 : 24} color={Colors.green400} />
            </View>
        }
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={1}>{listing.title}</Text>
        <Text style={styles.cardPrice}>{formatPrice(listing.price_per_month)}</Text>
        <View style={styles.cardMeta}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>Available</Text>
          </View>
          <Text style={styles.cardDist}>{formatDistance(distance)}</Text>
          <Text style={styles.cardBeds}>{listing.bedrooms} bd · {listing.bathrooms} ba</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
}

// ─── Filter modal ────────────────────────────────────────────
function FilterModal({
  visible, filters, onApply, onClose,
}: {
  visible: boolean
  filters: Filters
  onApply: (f: Filters) => void
  onClose: () => void
}) {
  const [local, setLocal] = useState(filters)

  const BEDROOM_OPTIONS = [null, 1, 2, 3, 4]

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.filterSheet}>
        <View style={styles.filterHandle} />
        <Text style={styles.filterTitle}>Filter listings</Text>

        <Text style={styles.filterLabel}>Max price (J$)</Text>
        <TextInput
          style={styles.filterInput}
          placeholder="e.g. 50000"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numeric"
          value={local.maxPrice}
          onChangeText={v => setLocal(p => ({ ...p, maxPrice: v }))}
        />

        <Text style={styles.filterLabel}>Bedrooms</Text>
        <View style={styles.filterPills}>
          {BEDROOM_OPTIONS.map(n => (
            <TouchableOpacity
              key={String(n)}
              style={[styles.filterPill, local.bedrooms === n && styles.filterPillActive]}
              onPress={() => setLocal(p => ({ ...p, bedrooms: n }))}
            >
              <Text style={[styles.filterPillText, local.bedrooms === n && styles.filterPillTextActive]}>
                {n === null ? 'Any' : n === 4 ? '4+' : String(n)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.filterActions}>
          <TouchableOpacity
            style={styles.filterReset}
            onPress={() => { setLocal({ maxPrice: '', bedrooms: null }); onApply({ maxPrice: '', bedrooms: null }) }}
          >
            <Text style={styles.filterResetText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterApply} onPress={() => { onApply(local); onClose() }}>
            <Text style={styles.filterApplyText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// ─── Main screen ─────────────────────────────────────────────
export default function HomeScreen() {
  const { profile } = useAuth()
  const { listings, loading, refetch } = useListings()
  const navigation = useNavigation<Nav>()
  const mapRef = useRef<MapView>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('map')
  const [search, setSearch] = useState('')
  const [filterVisible, setFilterVisible] = useState(false)
  const [filters, setFilters] = useState<Filters>({ maxPrice: '', bedrooms: null })
  const [verifyVisible, setVerifyVisible] = useState(false)

  // Students must be APPROVED before they can open a listing. They can still
  // browse the map/list while unverified or under review.
  const vStatus = profile?.verification_status
  const needsVerification = profile?.role === 'student' && vStatus !== 'approved'

  useEffect(() => {
    // Auto-popup only when action is needed — not while it's pending review.
    if (needsVerification && vStatus !== 'pending') setVerifyVisible(true)
  }, [needsVerification, vStatus])

  const userLat = profile?.campus_lat ?? DEFAULT_LAT
  const userLng = profile?.campus_lng ?? DEFAULT_LNG

  const initialRegion: Region = {
    latitude: userLat,
    longitude: userLng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  }

  const distanceTo = (l: ListingWithDetails) => haversineKm(userLat, userLng, l.lat, l.lng)

  const filtered = listings
    .filter(l => {
      if (filters.maxPrice && l.price_per_month > Number(filters.maxPrice)) return false
      if (filters.bedrooms !== null && l.bedrooms !== filters.bedrooms) return false
      if (search) {
        const q = search.toLowerCase()
        return l.title.toLowerCase().includes(q) || (l.address ?? '').toLowerCase().includes(q)
      }
      return true
    })
    .sort((a, b) => distanceTo(a) - distanceTo(b))

  const hasActiveFilter = !!filters.maxPrice || filters.bedrooms !== null

  function goToDetail(id: string) {
    if (needsVerification) { setVerifyVisible(true); return }
    navigation.navigate('ListingDetail', { listingId: id })
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Search bar ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={Colors.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search rentals…"
            placeholderTextColor={Colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[styles.filterBtn, hasActiveFilter && styles.filterBtnActive]}
          onPress={() => setFilterVisible(true)}
        >
          <Ionicons
            name="options-outline"
            size={18}
            color={hasActiveFilter ? Colors.green50 : Colors.green600}
          />
        </TouchableOpacity>
      </View>

      {/* ── Map / List toggle ── */}
      <View style={styles.toggleRow}>
        {(['map', 'list'] as ViewMode[]).map(mode => (
          <TouchableOpacity
            key={mode}
            style={[styles.toggleTab, viewMode === mode && styles.toggleTabActive]}
            onPress={() => setViewMode(mode)}
          >
            <Text style={[styles.toggleText, viewMode === mode && styles.toggleTextActive]}>
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.listingCount}>
          {loading ? '…' : `${filtered.length} listing${filtered.length !== 1 ? 's' : ''}`}
        </Text>
      </View>

      {needsVerification && (
        <TouchableOpacity style={styles.verifyBanner} onPress={() => setVerifyVisible(true)} activeOpacity={0.8}>
          <Ionicons name={vStatus === 'pending' ? 'time-outline' : 'shield-checkmark-outline'} size={16} color={Colors.green600} />
          <Text style={styles.verifyBannerText}>
            {vStatus === 'pending'
              ? 'Student ID under review'
              : vStatus === 'rejected'
                ? 'ID not approved — tap to re-upload'
                : 'Verify your student ID to unlock listings'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={Colors.green600} />
        </TouchableOpacity>
      )}

      {/* ── Content ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.green600} />
        </View>
      ) : viewMode === 'map' ? (
        /* MAP VIEW */
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            provider={PROVIDER_GOOGLE}
            style={StyleSheet.absoluteFill}
            initialRegion={initialRegion}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {filtered.map(listing => (
              <Marker
                key={listing.id}
                coordinate={{ latitude: listing.lat, longitude: listing.lng }}
                anchor={{ x: 0.5, y: 1 }}
                onPress={() => goToDetail(listing.id)}
              >
                <View style={styles.pin}>
                  <View style={styles.pinHead}>
                    <Image
                      source={require('../../../assets/logo.png')}
                      style={styles.pinLogo}
                      resizeMode="contain"
                    />
                  </View>
                  <View style={styles.pinTip} />
                </View>
              </Marker>
            ))}
          </MapView>

          {/* Empty state */}
          {filtered.length === 0 && (
            <View style={styles.mapEmpty}>
              <Text style={styles.mapEmptyText}>No listings in this area yet</Text>
            </View>
          )}
        </View>
      ) : (
        /* LIST VIEW */
        filtered.length === 0 ? (
          <View style={styles.center}>
            <Ionicons name="home-outline" size={40} color={Colors.borderMid} />
            <Text style={styles.emptyText}>No listings found</Text>
            {hasActiveFilter && (
              <TouchableOpacity onPress={() => setFilters({ maxPrice: '', bedrooms: null })}>
                <Text style={styles.emptyAction}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onRefresh={refetch}
            refreshing={loading}
            renderItem={({ item }) => (
              <ListingCard
                listing={item}
                distance={distanceTo(item)}
                onPress={() => goToDetail(item.id)}
              />
            )}
          />
        )
      )}

      <FilterModal
        visible={filterVisible}
        filters={filters}
        onApply={setFilters}
        onClose={() => setFilterVisible(false)}
      />

      <StudentIdModal visible={verifyVisible} onClose={() => setVerifyVisible(false)} />
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },

  searchRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 6,
  },
  searchBar: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.bgPrimary,
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  searchInput: { fontFamily: Fonts.regular, flex: 1, fontSize: 14, color: Colors.textPrimary },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: { backgroundColor: Colors.green600 },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 4,
  },
  toggleTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.bgSecondary,
  },
  toggleTabActive: { backgroundColor: Colors.green600 },
  toggleText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  toggleTextActive: { color: Colors.green50 },
  listingCount: { fontFamily: Fonts.regular, marginLeft: 'auto', fontSize: 12, color: Colors.textTertiary },

  verifyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.green50,
    borderWidth: 1,
    borderColor: Colors.green600,
  },
  verifyBannerText: { flex: 1, fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600 },

  mapContainer: { flex: 1, overflow: 'hidden' },
  mapEmpty: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: Colors.bgPrimary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  mapEmptyText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },

  pin: { alignItems: 'center' },
  pinHead: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pinLogo: { width: 30, height: 30 },
  pinTip: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: Colors.green600,
    marginTop: -2,
  },

  listContent: { padding: 16, gap: 12 },

  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: 14,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardCompact: { borderRadius: 12 },
  cardImage: {
    width: 100,
    backgroundColor: Colors.bgTertiary,
    overflow: 'hidden',
  },
  cardImageCompact: { width: 80 },
  cardBody: {
    flex: 1,
    padding: 12,
    gap: 3,
    justifyContent: 'center',
  },
  cardTitle: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.textPrimary },
  cardPrice: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.green600 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  pill: {
    backgroundColor: Colors.green50,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  pillText: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.green600 },
  cardDist: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary },
  cardBeds: { fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary },
  emptyAction: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.green600 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  filterSheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
    gap: 12,
  },
  filterHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderMid,
    alignSelf: 'center',
    marginBottom: 8,
  },
  filterTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.textPrimary },
  filterLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  filterInput: { fontFamily: Fonts.regular,
    height: 46,
    borderRadius: 10,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5,
    borderColor: Colors.borderMid,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  filterPills: { flexDirection: 'row', gap: 8 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  filterPillActive: { backgroundColor: Colors.green600, borderColor: Colors.green600 },
  filterPillText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  filterPillTextActive: { color: Colors.green50 },
  filterActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  filterReset: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterResetText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.textSecondary },
  filterApply: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterApplyText: { fontSize: 15, fontFamily: Fonts.bold, color: Colors.green50 },
})
