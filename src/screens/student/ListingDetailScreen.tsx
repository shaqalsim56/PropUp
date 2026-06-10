import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, Linking, ActivityIndicator, Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { StudentStackParamList } from '../../navigation/types'
import { ListingWithDetails } from '../../types/database.types'
import { formatPrice, haversineKm, formatDistance } from '../../utils/distance'

type Props = NativeStackScreenProps<StudentStackParamList, 'ListingDetail'>

const { width: SCREEN_W } = Dimensions.get('window')
const PHOTO_H = 260

function getPhotoUrl(storagePath: string): string {
  return supabase.storage.from('listing-photos').getPublicUrl(storagePath).data.publicUrl
}

export default function ListingDetailScreen({ route, navigation }: Props) {
  const { listingId } = route.params
  const { session, profile } = useAuth()

  const [listing, setListing] = useState<ListingWithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  const userLat = profile?.campus_lat ?? 17.997
  const userLng = profile?.campus_lng ?? -76.794

  useEffect(() => {
    loadListing()
  }, [listingId])

  async function loadListing() {
    const [{ data }, { data: savedData }] = await Promise.all([
      supabase
        .from('listings')
        .select('*, listing_photos(id, storage_path, order_index), profiles(full_name, phone)')
        .eq('id', listingId)
        .single(),
      supabase
        .from('saved_listings')
        .select('id')
        .eq('listing_id', listingId)
        .eq('student_id', session!.user.id)
        .maybeSingle(),
    ])

    setListing(data as ListingWithDetails)
    setSaved(!!savedData)
    setLoading(false)

    // Record view
    supabase.from('listing_views').insert({
      listing_id: listingId,
      student_id: session!.user.id,
    })
  }

  async function toggleSave() {
    if (!listing) return
    setSaveLoading(true)
    if (saved) {
      await supabase
        .from('saved_listings')
        .delete()
        .eq('listing_id', listing.id)
        .eq('student_id', session!.user.id)
      setSaved(false)
    } else {
      await supabase.from('saved_listings').insert({
        listing_id: listing.id,
        student_id: session!.user.id,
      })
      setSaved(true)
    }
    setSaveLoading(false)
  }

  function callLandlord() {
    if (!listing?.profiles.phone) return
    Linking.openURL(`tel:${listing.profiles.phone}`)
  }

  function whatsappLandlord() {
    if (!listing?.profiles.phone) return
    const digits = listing.profiles.phone.replace(/\D/g, '')
    Linking.openURL(`https://wa.me/${digits}`)
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.green600} size="large" />
      </View>
    )
  }

  if (!listing) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Listing not found.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.errorAction}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const photos = [...listing.listing_photos].sort((a, b) => a.order_index - b.order_index)
  const distance = haversineKm(userLat, userLng, listing.lat, listing.lng)
  const hasPhone = !!listing.profiles.phone

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Back + Save header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={toggleSave} disabled={saveLoading}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={saved ? Colors.green600 : Colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} bounces>
        {/* ── Photo gallery ── */}
        {photos.length > 0 ? (
          <View>
            <FlatList
              data={photos}
              keyExtractor={p => p.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={e => {
                setPhotoIndex(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: getPhotoUrl(item.storage_path) }}
                  style={{ width: SCREEN_W, height: PHOTO_H }}
                  resizeMode="cover"
                />
              )}
            />
            {photos.length > 1 && (
              <View style={styles.photoDots}>
                {photos.map((_, i) => (
                  <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photoPlaceholder, { alignItems: 'center', justifyContent: 'center' }]}>
            <Ionicons name="home-outline" size={52} color={Colors.green400} />
          </View>
        )}

        <View style={styles.body}>
          {/* ── Title + price ── */}
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{listing.title}</Text>
          </View>
          <Text style={styles.price}>{formatPrice(listing.price_per_month)}</Text>

          {/* ── Pills ── */}
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: Colors.green50 }]}>
              <Text style={[styles.pillText, { color: Colors.green600 }]}>Available</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{listing.bedrooms} bed</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{listing.bathrooms} bath</Text>
            </View>
            <View style={styles.pill}>
              <Text style={styles.pillText}>{formatDistance(distance)}</Text>
            </View>
          </View>

          {/* ── Address ── */}
          {listing.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={15} color={Colors.textTertiary} />
              <Text style={styles.address}>{listing.address}</Text>
            </View>
          )}

          {/* ── Description ── */}
          {listing.description && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>About this place</Text>
              <Text style={styles.description}>{listing.description}</Text>
            </>
          )}

          {/* ── Landlord ── */}
          <View style={styles.divider} />
          <Text style={styles.sectionLabel}>Listed by</Text>
          <View style={styles.landlordRow}>
            <View style={styles.landlordAvatar}>
              <Text style={styles.landlordInitial}>
                {listing.profiles.full_name?.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.landlordName}>{listing.profiles.full_name}</Text>
          </View>

          <View style={styles.divider} />
        </View>
      </ScrollView>

      {/* ── Contact actions ── */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionCall, !hasPhone && styles.actionDisabled]}
          onPress={callLandlord}
          disabled={!hasPhone}
        >
          <Ionicons name="call-outline" size={18} color={Colors.green600} />
          <Text style={[styles.actionText, { color: Colors.green600 }]}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionWhatsApp, !hasPhone && styles.actionDisabled]}
          onPress={whatsappLandlord}
          disabled={!hasPhone}
        >
          <Ionicons name="logo-whatsapp" size={18} color="#fff" />
          <Text style={[styles.actionText, { color: '#fff' }]}>WhatsApp</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  errorText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary },
  errorAction: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.green600 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.bgPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },

  photoPlaceholder: {
    width: SCREEN_W,
    height: PHOTO_H,
    backgroundColor: Colors.green50,
  },
  photoDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    position: 'absolute',
    bottom: 12,
    width: '100%',
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff', width: 18 },

  body: { padding: 20, gap: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
  title: { flex: 1, fontSize: 22, fontFamily: Fonts.bold, color: Colors.textPrimary, lineHeight: 28 },
  price: { fontSize: 18, fontFamily: Fonts.bold, color: Colors.green600 },

  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    backgroundColor: Colors.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillText: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textSecondary },

  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  address: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary, flex: 1 },

  divider: { height: 0.5, backgroundColor: Colors.borderLight, marginVertical: 4 },
  sectionLabel: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.textSecondary, marginBottom: 4 },
  description: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },

  landlordRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  landlordAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  landlordInitial: { fontSize: 16, fontFamily: Fonts.bold, color: Colors.green600 },
  landlordName: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },

  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.bgPrimary,
  },
  actionBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionCall: {
    backgroundColor: Colors.green50,
    borderWidth: 1,
    borderColor: Colors.green600,
  },
  actionWhatsApp: { backgroundColor: '#25D366' },
  actionDisabled: { opacity: 0.4 },
  actionText: { fontSize: 15, fontFamily: Fonts.bold },
})
