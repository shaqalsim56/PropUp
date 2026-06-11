import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator, Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as ImageManipulator from 'expo-image-manipulator'
import { decode } from 'base64-arraybuffer'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import { Fonts } from '../constants/fonts'

interface Props {
  visible: boolean
  onClose: () => void
}

// Student ID verification popup. Lets a logged-in student upload their ID to
// the private `student-ids` bucket and stamps `student_id_url` on their profile.
export default function StudentIdModal({ visible, onClose }: Props) {
  const { session, profile, refreshProfile } = useAuth()
  const status = profile?.verification_status
  const [image, setImage] = useState<{ uri: string; base64: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function choosePhoto() {
    Alert.alert('Add student ID', undefined, [
      { text: 'Take Photo', onPress: () => pickFrom('camera') },
      { text: 'Choose from Library', onPress: () => pickFrom('library') },
      { text: 'Cancel', style: 'cancel' },
    ])
  }

  async function pickFrom(source: 'camera' | 'library') {
    const perm = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError(source === 'camera' ? 'Camera access is required.' : 'Photo access is required.')
      return
    }
    const res = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 })
    if (res.canceled) return

    // Downscale + compress before upload so the request stays small and fast
    // (full-size photos are several MB and time out on slow connections).
    const out = await ImageManipulator.manipulateAsync(
      res.assets[0].uri,
      [{ resize: { width: 1400 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    )
    setImage({ uri: out.uri, base64: out.base64 ?? '' })
    setError('')
  }

  async function submit() {
    if (!image || !session) {
      setError('Please select your student ID.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const uid = session.user.id
      const oldPath = profile?.student_id_url ?? null
      // Unique filename per upload so a re-upload changes student_id_url and the
      // DB guard re-marks the profile 'pending' for review.
      const path = `${uid}/student-id-${Date.now()}.jpg`

      const { error: upErr } = await supabase.storage
        .from('student-ids')
        .upload(path, decode(image.base64), { contentType: 'image/jpeg', upsert: true })
      if (upErr) { setError(upErr.message); return }

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ student_id_url: path })
        .eq('id', uid)
      if (updErr) { setError(updErr.message); return }

      // Best-effort cleanup of the previous file.
      if (oldPath && oldPath !== path) {
        await supabase.storage.from('student-ids').remove([oldPath])
      }

      await refreshProfile()
      setImage(null)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          {status === 'pending' ? (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="time-outline" size={28} color={Colors.green600} />
              </View>
              <Text style={styles.title}>ID under review</Text>
              <Text style={styles.body}>
                Thanks! We're reviewing your student ID. You'll be able to open listings and
                message landlords as soon as it's approved.
              </Text>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={28} color={Colors.green600} />
              </View>
              <Text style={styles.title}>{status === 'rejected' ? 'ID not approved' : 'Verify your student status'}</Text>
              <Text style={styles.body}>
                {status === 'rejected'
                  ? "Your last upload couldn't be verified. Please upload a clear, full photo of your student ID."
                  : 'Upload a photo of your student ID to unlock listings and contact landlords. You can keep browsing in the meantime.'}
              </Text>

              {image ? (
                <View style={styles.preview}>
                  <Image source={{ uri: image.uri }} style={styles.previewImg} resizeMode="cover" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.previewName} numberOfLines={1}>Student ID</Text>
                    <TouchableOpacity onPress={choosePhoto}>
                      <Text style={styles.change}>Change photo</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.upload} onPress={choosePhoto} activeOpacity={0.7}>
                  <Ionicons name="camera-outline" size={22} color={Colors.green600} />
                  <Text style={styles.uploadText}>Take Photo or Upload</Text>
                </TouchableOpacity>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submit, (!image || uploading) && styles.dim]}
                onPress={submit}
                disabled={!image || uploading}
                activeOpacity={0.85}
              >
                {uploading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.submitText}>Submit for verification</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity onPress={onClose} disabled={uploading} hitSlop={8}>
            <Text style={styles.later}>{status === 'pending' ? 'Close' : 'Maybe later'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.green50,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.black, textAlign: 'center' },
  body: {
    fontFamily: Fonts.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 56,
    width: '100%',
    borderRadius: 18,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.green600,
    backgroundColor: Colors.green50,
    marginTop: 4,
  },
  uploadText: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.green600 },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    width: '100%',
    borderRadius: 18,
    backgroundColor: Colors.bgTertiary,
    marginTop: 4,
  },
  previewImg: { width: 56, height: 56, borderRadius: 12, backgroundColor: Colors.bgSecondary },
  previewName: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.black },
  change: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600, marginTop: 2 },
  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B', textAlign: 'center' },
  submit: {
    height: 56,
    width: '100%',
    borderRadius: 28,
    backgroundColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  dim: { opacity: 0.5 },
  submitText: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.white },
  later: { fontFamily: Fonts.bold, fontSize: 14, color: Colors.textTertiary, paddingVertical: 6 },
})
