import { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform,
  TouchableOpacity, TextInput, Image, Switch, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import MapView, { Marker, Region, PROVIDER_GOOGLE, LatLng } from 'react-native-maps'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { LandlordStackParamList } from '../../navigation/types'
import PillButton from '../../components/ui/PillButton'

type Props = NativeStackScreenProps<LandlordStackParamList, 'EditListing'>
const MAX_PHOTOS = 6
type Photo = { id: string; storage_path: string; url: string }

function publicUrl(path: string) {
  return supabase.storage.from('listing-photos').getPublicUrl(path).data.publicUrl
}

export default function EditListingScreen({ route, navigation }: Props) {
  const { listingId } = route.params
  const { session } = useAuth()

  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [bedrooms, setBedrooms] = useState(1)
  const [bathrooms, setBathrooms] = useState(1)
  const [address, setAddress] = useState('')
  const [coord, setCoord] = useState<LatLng>({ latitude: 17.997, longitude: -76.794 })
  const [available, setAvailable] = useState(true)
  const [photos, setPhotos] = useState<Photo[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const region: Region = { ...coord, latitudeDelta: 0.02, longitudeDelta: 0.02 }

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('listings')
        .select('*, listing_photos(id, storage_path, order_index)')
        .eq('id', listingId)
        .single()
      if (data) {
        setTitle(data.title)
        setDescription(data.description ?? '')
        setPrice(String(data.price_per_month))
        setBedrooms(data.bedrooms)
        setBathrooms(data.bathrooms)
        setAddress(data.address ?? '')
        setCoord({ latitude: data.lat, longitude: data.lng })
        setAvailable(data.is_available)
        const sorted = [...(data.listing_photos ?? [])].sort((a, b) => a.order_index - b.order_index)
        setPhotos(sorted.map(p => ({ id: p.id, storage_path: p.storage_path, url: publicUrl(p.storage_path) })))
      }
      setLoading(false)
    })()
  }, [listingId])

  async function addPhotos() {
    if (!session || photos.length >= MAX_PHOTOS) return
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { setError('Photo access is required.'); return }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length, quality: 0.6, base64: true,
    })
    if (res.canceled) return

    let order = photos.length
    for (const a of res.assets) {
      if (!a.base64) continue
      const ext = (a.uri.split('.').pop() || 'jpg').toLowerCase()
      const path = `${session.user.id}/${listingId}/${Date.now()}-${order}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('listing-photos')
        .upload(path, decode(a.base64), { contentType: a.mimeType ?? 'image/jpeg', upsert: true })
      if (upErr) { setError(upErr.message); continue }
      const { data: row } = await supabase
        .from('listing_photos')
        .insert({ listing_id: listingId, storage_path: path, order_index: order })
        .select('id')
        .single()
      if (row) setPhotos(prev => [...prev, { id: row.id, storage_path: path, url: publicUrl(path) }])
      order++
    }
  }

  async function removePhoto(photo: Photo) {
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
    await supabase.from('listing_photos').delete().eq('id', photo.id)
    await supabase.storage.from('listing-photos').remove([photo.storage_path])
  }

  async function save() {
    if (!title.trim()) { setError('Please enter a title.'); return }
    const priceNum = Number(price)
    if (!price || isNaN(priceNum) || priceNum <= 0) { setError('Please enter a valid monthly price.'); return }

    setSaving(true)
    setError('')
    try {
      const { error: updErr } = await supabase
        .from('listings')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price_per_month: Math.round(priceNum),
          bedrooms, bathrooms,
          lat: coord.latitude, lng: coord.longitude,
          address: address.trim() || null,
          is_available: available,
        })
        .eq('id', listingId)
      if (updErr) { setError(updErr.message); return }
      navigation.goBack()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error — please try again.')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete() {
    Alert.alert('Delete listing', 'This permanently removes the listing and its photos. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          setSaving(true)
          if (photos.length) await supabase.storage.from('listing-photos').remove(photos.map(p => p.storage_path))
          await supabase.from('listings').delete().eq('id', listingId)
          setSaving(false)
          navigation.goBack()
        },
      },
    ])
  }

  if (loading) {
    return <SafeAreaView style={styles.safe}><View style={styles.center}><ActivityIndicator color={Colors.green600} /></View></SafeAreaView>
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="close" size={26} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Listing</Text>
        <TouchableOpacity onPress={confirmDelete} hitSlop={8}>
          <Ionicons name="trash-outline" size={22} color="#C0392B" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Availability */}
          <View style={styles.availRow}>
            <View>
              <Text style={styles.label}>Available</Text>
              <Text style={styles.hint}>Hidden listings don't show to students.</Text>
            </View>
            <Switch
              value={available}
              onValueChange={setAvailable}
              trackColor={{ true: Colors.green600, false: Colors.borderMid }}
              thumbColor={Colors.white}
            />
          </View>

          {/* Photos */}
          <Text style={styles.label}>Photos</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
            {photos.map(p => (
              <View key={p.id} style={styles.photo}>
                <Image source={{ uri: p.url }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(p)} hitSlop={6}>
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

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline textAlignVertical="top" placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Price per month (J$)</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="numeric" placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.stepperGroup}>
            <View style={styles.stepper}>
              <Text style={styles.label}>Bedrooms</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setBedrooms(v => Math.max(1, v - 1))}><Ionicons name="remove" size={18} color={Colors.green600} /></TouchableOpacity>
                <Text style={styles.stepValue}>{bedrooms}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setBedrooms(v => v + 1)}><Ionicons name="add" size={18} color={Colors.green600} /></TouchableOpacity>
              </View>
            </View>
            <View style={styles.stepper}>
              <Text style={styles.label}>Bathrooms</Text>
              <View style={styles.stepperRow}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setBathrooms(v => Math.max(1, v - 1))}><Ionicons name="remove" size={18} color={Colors.green600} /></TouchableOpacity>
                <Text style={styles.stepValue}>{bathrooms}</Text>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setBathrooms(v => v + 1)}><Ionicons name="add" size={18} color={Colors.green600} /></TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholderTextColor={Colors.textTertiary} />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Location</Text>
            <Text style={styles.hint}>Drag the marker or tap the map.</Text>
            <View style={styles.mapBox}>
              <MapView provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFill} region={region} onPress={e => setCoord(e.nativeEvent.coordinate)}>
                <Marker coordinate={coord} draggable onDragEnd={e => setCoord(e.nativeEvent.coordinate)} />
              </MapView>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <PillButton title="Save Changes" onPress={save} loading={saving} style={{ marginTop: 4 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  headerTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.black },

  container: { padding: 20, paddingBottom: 40, gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.black },
  hint: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  input: {
    fontFamily: Fonts.regular, fontSize: 15, color: Colors.black,
    backgroundColor: Colors.bgTertiary, borderRadius: 18, paddingHorizontal: 16, height: 56,
  },
  textArea: { height: 110, paddingTop: 14, paddingBottom: 14 },

  availRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  stepperGroup: { flexDirection: 'row', gap: 12 },
  stepper: { flex: 1, gap: 8 },
  stepperRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.bgTertiary, borderRadius: 18, height: 56, paddingHorizontal: 8,
  },
  stepBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.black },

  photoRow: { gap: 10, paddingVertical: 2 },
  photo: { width: 88, height: 88, borderRadius: 14, overflow: 'hidden', backgroundColor: Colors.bgTertiary },
  photoRemove: {
    position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  photoAdd: {
    width: 88, height: 88, borderRadius: 14, borderWidth: 1.5, borderStyle: 'dashed',
    borderColor: Colors.green600, backgroundColor: Colors.green50,
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  photoAddText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.green600 },

  mapBox: { height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: Colors.bgTertiary },
  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },
})
