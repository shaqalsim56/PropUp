import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

function Row({ icon, label, value }: { icon: string; label: string; value?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon as any} size={18} color={Colors.green600} />
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowLabel}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
    </View>
  )
}

export default function LandlordProfileScreen() {
  const { session, profile, refreshProfile } = useAuth()
  const [editVisible, setEditVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [phone, setPhone] = useState(profile?.phone ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const initials = profile?.full_name
    ?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() ?? '?'

  async function handleSave() {
    if (!fullName.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', session!.user.id)
    await refreshProfile()
    setSaving(false)
    setEditVisible(false)
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => { setSigningOut(true); await supabase.auth.signOut() },
      },
    ])
  }

  if (!profile) return null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
          <Text style={styles.name}>{profile.full_name}</Text>
          <View style={styles.badge}>
            <Ionicons name="business-outline" size={12} color={Colors.green600} />
            <Text style={styles.badgeText}>Landlord</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Row icon="mail-outline" label="Email" value={session?.user.email} />
            <View style={styles.separator} />
            <Row icon="call-outline" label="Phone" value={profile.phone ?? 'Not set'} />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <TouchableOpacity style={styles.actionRow} onPress={() => { setFullName(profile.full_name); setPhone(profile.phone ?? ''); setEditVisible(true) }}>
              <View style={styles.rowIcon}><Ionicons name="person-outline" size={18} color={Colors.green600} /></View>
              <Text style={styles.actionLabel}>Edit profile</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            {signingOut
              ? <ActivityIndicator color="#C0392B" style={{ paddingVertical: 16 }} />
              : (
                <TouchableOpacity style={styles.actionRow} onPress={confirmSignOut}>
                  <View style={[styles.rowIcon, styles.rowIconDanger]}><Ionicons name="log-out-outline" size={18} color="#C0392B" /></View>
                  <Text style={[styles.actionLabel, styles.danger]}>Sign out</Text>
                </TouchableOpacity>
              )}
          </View>
        </View>

        <Text style={styles.version}>PropUp MVP · v1.0</Text>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setEditVisible(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Edit profile</Text>
          <View style={{ gap: 14 }}>
            <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
            <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 876 XXX XXXX" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button title="Save changes" variant="green" onPress={handleSave} loading={saving} />
            <Button title="Cancel" variant="outline" onPress={() => setEditVisible(false)} disabled={saving} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },

  hero: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatar: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: Colors.green600,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bold, fontSize: 28, color: Colors.white },
  name: { fontFamily: Fonts.bold, fontSize: 20, color: Colors.black },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.green50, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4,
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 12, color: Colors.green600 },

  section: { gap: 6 },
  sectionLabel: {
    fontFamily: Fonts.bold, fontSize: 11, color: Colors.textTertiary,
    letterSpacing: 0.8, marginLeft: 4, textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.bgPrimary, borderRadius: 14,
    borderWidth: 0.5, borderColor: Colors.borderLight, overflow: 'hidden',
  },
  separator: { height: 0.5, backgroundColor: Colors.borderLight, marginLeft: 52 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.green50, alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: '#FDECEA' },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  rowValue: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary },

  actionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  actionLabel: { flex: 1, fontFamily: Fonts.bold, fontSize: 15, color: Colors.textPrimary },
  danger: { color: '#C0392B' },

  version: { textAlign: 'center', fontFamily: Fonts.regular, fontSize: 11, color: Colors.textTertiary, marginTop: 8 },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.bgPrimary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.borderMid, alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontFamily: Fonts.bold, fontSize: 17, color: Colors.black, marginBottom: 16 },
  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },
})
