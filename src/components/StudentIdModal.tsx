import { useState } from 'react'
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, Image, ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
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
  const { session, refreshProfile } = useAuth()
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function pick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError('Photo access is required to upload your ID.')
      return
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    })
    if (!res.canceled) {
      setAsset(res.assets[0])
      setError('')
    }
  }

  async function submit() {
    if (!asset || !session) {
      setError('Please select your student ID.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const uid = session.user.id
      const ext = (asset.uri.split('.').pop() || 'jpg').toLowerCase()
      const path = `${uid}/student-id.${ext}`

      const { error: upErr } = await supabase.storage
        .from('student-ids')
        .upload(path, decode(asset.base64 ?? ''), {
          contentType: asset.mimeType ?? 'image/jpeg',
          upsert: true,
        })
      if (upErr) { setError(upErr.message); return }

      const { error: updErr } = await supabase
        .from('profiles')
        .update({ student_id_url: path })
        .eq('id', uid)
      if (updErr) { setError(updErr.message); return }

      await refreshProfile()
      setAsset(null)
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
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark-outline" size={28} color={Colors.green600} />
          </View>
          <Text style={styles.title}>Verify your student status</Text>
          <Text style={styles.body}>
            Upload a photo of your student ID to unlock listings and contact landlords.
            You can keep browsing in the meantime.
          </Text>

          {asset ? (
            <View style={styles.preview}>
              <Image source={{ uri: asset.uri }} style={styles.previewImg} resizeMode="cover" />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewName} numberOfLines={1}>{asset.fileName ?? 'Student ID'}</Text>
                <TouchableOpacity onPress={pick}>
                  <Text style={styles.change}>Change photo</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.upload} onPress={pick} activeOpacity={0.7}>
              <Ionicons name="cloud-upload-outline" size={22} color={Colors.green600} />
              <Text style={styles.uploadText}>Choose Student ID</Text>
            </TouchableOpacity>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.submit, (!asset || uploading) && styles.dim]}
            onPress={submit}
            disabled={!asset || uploading}
            activeOpacity={0.85}
          >
            {uploading
              ? <ActivityIndicator color={Colors.white} />
              : <Text style={styles.submitText}>Submit for verification</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} disabled={uploading} hitSlop={8}>
            <Text style={styles.later}>Maybe later</Text>
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
