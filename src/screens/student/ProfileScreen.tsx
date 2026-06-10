import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, FlatList, Alert, ActivityIndicator, Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { UNIVERSITIES, getUniMeta } from '../../constants/universities'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

// ─── University logo with initials fallback ──────────────────
function UniLogo({ uri, shortName, color, size = 52 }: {
  uri: string; shortName: string; color: string; size?: number
}) {
  const [errored, setErrored] = useState(false)
  const radius = size * 0.18

  if (!uri || errored) {
    return (
      <View style={[styles.logoFallback, { width: size, height: size, borderRadius: radius, backgroundColor: 'rgba(255,255,255,0.18)' }]}>
        <Text style={[styles.logoFallbackText, { fontSize: size * 0.28 }]}>{shortName.slice(0, 4)}</Text>
      </View>
    )
  }

  return (
    <View style={[styles.logoBox, { width: size, height: size, borderRadius: radius }]}>
      <Image
        source={{ uri }}
        style={{ width: size - 10, height: size - 10 }}
        resizeMode="contain"
        onError={() => setErrored(true)}
      />
    </View>
  )
}

// ─── Edit profile modal ──────────────────────────────────────
function EditModal({
  visible, initial, onSave, onClose,
}: {
  visible: boolean
  initial: { fullName: string; phone: string; university: string }
  onSave: (data: typeof initial) => Promise<void>
  onClose: () => void
}) {
  const [fullName, setFullName] = useState(initial.fullName)
  const [phone, setPhone] = useState(initial.phone)
  const [university, setUniversity] = useState(initial.university)
  const [showUniPicker, setShowUniPicker] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!fullName.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError('')
    await onSave({ fullName: fullName.trim(), phone: phone.trim(), university })
    setSaving(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.editSheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Edit profile</Text>

        <View style={styles.editForm}>
          <Input label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" placeholder="Your name" />
          <Input label="Phone number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+1 876 XXX XXXX" />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>University</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowUniPicker(true)}>
              {university ? (() => {
                const m = getUniMeta(university)
                return (
                  <>
                    <UniLogo uri={m.logoUrl} shortName={m.shortName} color={m.color} size={28} />
                    <Text style={[styles.pickerValue, { marginLeft: 8 }]} numberOfLines={1}>{university}</Text>
                  </>
                )
              })() : (
                <Text style={styles.pickerPlaceholder}>Select your university</Text>
              )}
              <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button title="Save changes" variant="green" onPress={handleSave} loading={saving} />
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={saving} />
        </View>
      </View>

      {/* University picker sheet */}
      <Modal visible={showUniPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowUniPicker(false)} />
        <View style={styles.uniSheet}>
          <View style={styles.sheetHandle} />
          <Text style={[styles.sheetTitle, { paddingHorizontal: 20 }]}>Select university</Text>
          <FlatList
            data={UNIVERSITIES}
            keyExtractor={item => item}
            contentContainerStyle={{ paddingBottom: 20 }}
            renderItem={({ item }) => {
              const m = getUniMeta(item)
              const active = item === university
              return (
                <TouchableOpacity
                  style={[styles.uniOption, active && styles.uniOptionActive]}
                  onPress={() => { setUniversity(item); setShowUniPicker(false) }}
                >
                  <View style={[styles.uniOptionLogo, { backgroundColor: m.color + '18' }]}>
                    <UniLogo uri={m.logoUrl} shortName={m.shortName} color={m.color} size={32} />
                  </View>
                  <Text style={[styles.uniOptionText, active && styles.uniOptionTextActive]} numberOfLines={2}>
                    {item}
                  </Text>
                  {active && <Ionicons name="checkmark-circle" size={18} color={Colors.green600} />}
                </TouchableOpacity>
              )
            }}
          />
        </View>
      </Modal>
    </Modal>
  )
}

// ─── Settings row ────────────────────────────────────────────
function Row({ icon, label, value, onPress, danger = false }: {
  icon: string; label: string; value?: string; onPress?: () => void; danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#C0392B' : Colors.green600} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      {onPress && !danger && (
        <Ionicons name="chevron-forward" size={16} color={Colors.textTertiary} />
      )}
    </TouchableOpacity>
  )
}

// ─── Main screen ─────────────────────────────────────────────
export default function ProfileScreen() {
  const { session, profile, refreshProfile } = useAuth()
  const [editVisible, setEditVisible] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const uniMeta = getUniMeta(profile?.university)

  const initials = profile?.full_name
    ?.split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? '?'

  async function handleSave(data: { fullName: string; phone: string; university: string }) {
    await supabase
      .from('profiles')
      .update({
        full_name: data.fullName,
        phone: data.phone || null,
        university: data.university || null,
      })
      .eq('id', session!.user.id)
    await refreshProfile()
  }

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out', style: 'destructive',
        onPress: async () => {
          setSigningOut(true)
          await supabase.auth.signOut()
        },
      },
    ])
  }

  if (!profile) return null

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          {/* University banner */}
          <View style={[styles.heroBanner, { backgroundColor: uniMeta.color }]}>
            <UniLogo uri={uniMeta.logoUrl} shortName={uniMeta.shortName} color={uniMeta.color} size={56} />
            <View style={styles.heroBannerText}>
              <Text style={styles.heroBannerShort}>{uniMeta.shortName}</Text>
              {profile.university ? (
                <Text style={styles.heroBannerFull} numberOfLines={2}>{profile.university}</Text>
              ) : (
                <Text style={styles.heroBannerNone}>No university set</Text>
              )}
            </View>
          </View>

          {/* Floating avatar */}
          <View style={styles.heroAvatarWrap}>
            <View style={styles.heroAvatar}>
              <Text style={styles.heroAvatarText}>{initials}</Text>
            </View>
          </View>

          {/* Name + badge */}
          <View style={styles.heroInfo}>
            <Text style={styles.heroName}>{profile.full_name}</Text>
            <View style={styles.heroBadge}>
              <Ionicons name="school-outline" size={12} color={Colors.green600} />
              <Text style={styles.heroBadgeText}>Student</Text>
            </View>
          </View>
        </View>

        {/* ── Account ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Row icon="mail-outline" label="Email" value={session?.user.email} />
            <View style={styles.separator} />
            <Row icon="call-outline" label="Phone" value={profile.phone ?? 'Not set'} />
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.card}>
            <Row icon="person-outline" label="Edit profile" onPress={() => setEditVisible(true)} />
            <View style={styles.separator} />
            <Row icon="notifications-outline" label="Notifications" value="Coming soon" />
          </View>
        </View>

        {/* ── Sign out ── */}
        <View style={styles.section}>
          <View style={styles.card}>
            {signingOut
              ? <ActivityIndicator color="#C0392B" style={{ paddingVertical: 16 }} />
              : <Row icon="log-out-outline" label="Sign out" onPress={confirmSignOut} danger />
            }
          </View>
        </View>

        <Text style={styles.version}>PropUp MVP · v1.0</Text>
      </ScrollView>

      <EditModal
        visible={editVisible}
        initial={{
          fullName: profile.full_name,
          phone: profile.phone ?? '',
          university: profile.university ?? '',
        }}
        onSave={handleSave}
        onClose={() => setEditVisible(false)}
      />
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  scroll: { padding: 16, gap: 8, paddingBottom: 40 },

  // Hero card
  heroCard: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 4,
  },
  heroBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 14,
  },
  heroBannerText: { flex: 1 },
  heroBannerShort: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  heroBannerFull: { fontFamily: Fonts.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 2,
    lineHeight: 15,
  },
  heroBannerNone: { fontFamily: Fonts.regular,
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
    fontStyle: 'italic',
  },

  logoBox: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    fontFamily: Fonts.bold,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  heroAvatarWrap: {
    alignItems: 'center',
    marginTop: -36,
    zIndex: 1,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: Colors.bgPrimary,
  },
  heroAvatarText: { fontSize: 26, fontFamily: Fonts.bold, color: Colors.green50 },

  heroInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    gap: 8,
  },
  heroName: { fontSize: 20, fontFamily: Fonts.bold, color: Colors.textPrimary },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.green50,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  heroBadgeText: { fontSize: 12, fontFamily: Fonts.bold, color: Colors.green600 },

  // Sections & cards
  section: { gap: 6 },
  sectionLabel: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.bgPrimary,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
    overflow: 'hidden',
  },
  separator: { height: 0.5, backgroundColor: Colors.borderLight, marginLeft: 52 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.green50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FDECEA' },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  rowLabelDanger: { color: '#C0392B' },
  rowValue: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary },

  version: { fontFamily: Fonts.regular, textAlign: 'center', fontSize: 11, color: Colors.textTertiary, marginTop: 8 },

  // Edit modal
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  editSheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderMid,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: { fontSize: 17, fontFamily: Fonts.bold, color: Colors.textPrimary, marginBottom: 16 },
  editForm: { gap: 14 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary },
  picker: {
    minHeight: 50,
    borderRadius: 10,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5,
    borderColor: Colors.borderMid,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerValue: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textTertiary, flex: 1 },
  errorText: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },

  // University picker sheet
  uniSheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    maxHeight: '65%',
  },
  uniOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  uniOptionActive: { backgroundColor: Colors.green50 },
  uniOptionLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  uniOptionText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textSecondary, flex: 1, lineHeight: 18 },
  uniOptionTextActive: { color: Colors.green600, fontFamily: Fonts.bold },
})
