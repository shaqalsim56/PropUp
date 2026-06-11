import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, TextInput, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, Region, PROVIDER_GOOGLE, LatLng } from 'react-native-maps'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { LandlordStackParamList } from '../../navigation/types'
import PillButton from '../../components/ui/PillButton'

type Props = {
  navigation: NativeStackNavigationProp<LandlordStackParamList, 'CreateListing'>
}

// Kingston city centre — default map pin until the landlord moves it.
const DEFAULT_COORD: LatLng = { latitude: 17.997, longitude: -76.794 }
const MAX_PHOTOS = 6

function Stepper({ label, value, onChange, min = 1 }: {
  label: string; value: number; onChange: (v: number) => void; min?: number
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={styles.stepBtn}
          onPress={() => onChange(Math.max(min, value - 1))}
          hitSlop={6}
        >
          <Ionicons name="remove" size={18} color={Colors.green600} />
        </TouchableOpacity>
        <Text style={styles.stepValue}>{value}</Text>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(value + 1)} hitSlop={6}>
          <Ionicons name="add" size={18} color={Colors.green600} />
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default function CreateListingScreen({ navigation }: Props) {
  const { session } = useAuth()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [address, setAddress] = useState('')
  const [coord, setCoord] = useState<LatLng>(DEFAULT_COORD)
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const region: Region = { ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 }

  // Default the pin to the landlord's current location, if granted.
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({})
        setCoord({ latitude: loc.coords.latitude, longitude: loc.coords.longitude })
      }
    })()
  }, [])

  async function addPhotos() {
    if (photos.length >= MAX_PHOTOS) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setError('Photo access is required to add images.'); return }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
      quality: 0.6,
      base64: true,
    })
    if (!res.canceled) {
      setPhotos(prev => [...prev, ...res.assets].slice(0, MAX_PHOTOS))
      setError('')
    }
  }

  function removePhoto(i: number) {
    setPhotos(prev => prev.filter((_, idx) => idx !== i))
  }

  async function publish() {
    if (!title.trim()) { setError('Please enter a title.'); return }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('Please enter a valid monthly price.'); return }
    if (photos.length === 0) { setError('Please add at least one photo of the property.'); return }
    if (!session) { setError('You must be signed in.'); return }

    setSubmitting(true)
    setError('')

    try {
      const { data: listing, error: insErr } = await supabase
        .from('listings')
        .insert({
          landlord_id: session.user.id,
          title: title.trim(),
          description: description.trim() || null,
          price_per_month: Math.round(priceNum),
          bedrooms,
          bathrooms,
          lat: coord.latitude,
          lng: coord.longitude,
          address: address.trim() || null,
          is_available: true,
        })
        .select()
        .single()

      if (insErr || !listing) {
        setError(insErr?.message ?? 'Could not create the listing.')
        return
      }

      // Upload photos under <uid>/<listingId>/<i>.<ext> and record them.
      for (let i = 0; i < photos.length; i++) {
        const a = photos[i]
        if (!a.base64) continue
        const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase()
        const path = `${session.user.id}/${listing.id}/${i}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('listing-photos')
          .upload(path, decode(a.base64), { contentType: a.mimeType ?? 'image/jpeg', upsert: true })
        if (!upErr) {
          await supabase.from('listing_photos').insert({
            listing_id: listing.id,
            storage_path: path,
            order_index: i,
          })
        }
      }

      navigation.goBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error — please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Listing</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Photos */}
          <Text style={styles.label}>Photos</Text>
          <Text style={styles.hint}>At least one photo of the property is required.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map((p, i) => (
              <View key={p.assetId ?? p.uri} style={styles.photo}>
                <Image source={{ uri: p.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={Colors.white} />
                </TouchableOpacity>
              </View>
            ))}
            {photos.length < MAX_PHOTOS && (
              <TouchableOpacity style={styles.photoAdd} onPress={addPhotos} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={24} color={Colors.green600} />
                <Text style={styles.photoAddText}>Add</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Cozy 2-bed near UTech"
              placeholderTextColor={Colors.textTertiary}
              value={title}
              onChangeText={setTitle}
            />
          </View>

          {/* Description */}
          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the place, amenities, rules…"
              placeholderTextColor={Colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Price */}
          <View style={styles.field}>
            <Text style={styles.label}>Price per month (J$)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 45000"
              placeholderTextColor={Colors.textTertiary}
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
            />
          </View>

          {/* Bedrooms / Bathrooms */}
          <View style={styles.stepperGroup}>
            <Stepper label="Bedrooms" value={bedrooms} onChange={setBedrooms} />
            <Stepper label="Bathrooms" value={bathrooms} onChange={setBathrooms} />
          </View>

          {/* Address */}
          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Street, area"
              placeholderTextColor={Colors.textTertiary}
              value={address}
              onChangeText={setAddress}
            />
          </View>

          {/* Location pin */}
          <View style={styles.field}>
            <Text style={styles.label}>Pin the location</Text>
            <Text style={styles.hint}>Drag the marker or tap the map to set the exact spot.</Text>
            <View style={styles.mapBox}>
              <MapView
                provider={PROVIDER_GOOGLE}
                style={StyleSheet.absoluteFill}
                region={region}
                onPress={e => setCoord(e.nativeEvent.coordinate)}
              >
                <Marker
                  coordinate={coord}
                  draggable
                  onDragEnd={e => setCoord(e.nativeEvent.coordinate)}
                />
              </MapView>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PillButton title="Publish Listing" onPress={publish} loading={submitting} style={{ marginTop: 4 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.black },

  container: { padding: 20, paddingBottom: 40, gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.black },
  hint: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary, marginTop: -4 },
  input: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black,
    backgroundColor: Colors.bgTertiary,
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
  },
  textArea: { height: 110, paddingTop: 14, paddingBottom: 14 },

  stepperGroup: { flexDirection: 'row', gap: 12 },
  stepper: { flex: 1, gap: 8 },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.bgTertiary,
    borderRadius: 18,
    height: 56,
    paddingHorizontal: 8,
  },
  stepBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.green50,
    alignItems: 'center', justifyContent: 'center',
  },
  stepValue: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.black },

  photoRow: { gap: 10, paddingVertical: 2 },
  photo: {
    width: 88, height: 88, borderRadius: 14, overflow: 'hidden',
    backgroundColor: Colors.bgTertiary,
  },
  photoRemove: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 88, height: 88, borderRadius: 14,
    borderWidth: 1.5, borderStyle: 'dashed', borderColor: Colors.green600,
    backgroundColor: Colors.green50,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  photoAddText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.green600 },

  mapBox: { height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgTertiary },

  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },
})
