import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Modal, FlatList, Alert, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { UNIVERSITIES } from '../../constants/universities'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

// ─── Edit profile modal ──────────────────────────────────────
function EditModal({
  visible,
  initial,
  onSave,
  onClose,
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
          <Input
            label="Full name"
            value={fullName}
            onChangeText={setFullName}
            autoCapitalize="words"
            placeholder="Your name"
          />
          <Input
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+1 876 XXX XXXX"
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>University</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowUniPicker(true)}>
              <Text style={university ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
                {university || 'Select your university'}
              </Text>
              <Ionicons name="chevron-down" size={14} color={Colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button title="Save changes" variant="purple" onPress={handleSave} loading={saving} />
          <Button title="Cancel" variant="outline" onPress={onClose} disabled={saving} />
        </View>
      </View>

      {/* University picker */}
      <Modal visible={showUniPicker} transparent animationType="slide">
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowUniPicker(false)} />
        <View style={styles.uniSheet}>
          <Text style={styles.sheetTitle}>Select university</Text>
          <FlatList
            data={UNIVERSITIES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.uniOption}
                onPress={() => { setUniversity(item); setShowUniPicker(false) }}
              >
                <Text style={[styles.uniOptionText, item === university && styles.uniOptionActive]}>
                  {item}
                </Text>
                {item === university && (
                  <Ionicons name="checkmark" size={16} color={Colors.purple600} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </Modal>
  )
}

// ─── Row component ───────────────────────────────────────────
function Row({
  icon, label, value, onPress, danger = false,
}: {
  icon: string
  label: string
  value?: string
  onPress?: () => void
  danger?: boolean
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon as any} size={18} color={danger ? '#C0392B' : Colors.purple600} />
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

        {/* ── Avatar + name header ── */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{profile.full_name}</Text>
          {profile.university ? (
            <Text style={styles.university} numberOfLines={1}>{profile.university}</Text>
          ) : null}
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Student</Text>
          </View>
        </View>

        {/* ── Account info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Account</Text>
          <View style={styles.card}>
            <Row
              icon="mail-outline"
              label="Email"
              value={session?.user.email}
            />
            <View style={styles.separator} />
            <Row
              icon="call-outline"
              label="Phone"
              value={profile.phone ?? 'Not set'}
            />
          </View>
        </View>

        {/* ── Settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Settings</Text>
          <View style={styles.card}>
            <Row
              icon="person-outline"
              label="Edit profile"
              onPress={() => setEditVisible(true)}
            />
            <View style={styles.separator} />
            <Row
              icon="notifications-outline"
              label="Notifications"
              value="Coming soon"
            />
          </View>
        </View>

        {/* ── Sign out ── */}
        <View style={styles.section}>
          <View style={styles.card}>
            {signingOut
              ? <ActivityIndicator color="#C0392B" style={{ paddingVertical: 16 }} />
              : <Row
                  icon="log-out-outline"
                  label="Sign out"
                  onPress={confirmSignOut}
                  danger
                />
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
  scroll: { padding: 20, gap: 6, paddingBottom: 40 },

  header: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.purple600,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: Colors.purple50 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  university: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  roleBadge: {
    backgroundColor: Colors.purple50,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 2,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '600', color: Colors.purple600 },

  section: { gap: 6 },
  sectionLabel: { fontSize: 12, fontWeight: '600', color: Colors.textTertiary, letterSpacing: 0.5, marginLeft: 4 },
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
    backgroundColor: Colors.purple50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowIconDanger: { backgroundColor: '#FDECEA' },
  rowBody: { flex: 1, gap: 1 },
  rowLabel: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  rowLabelDanger: { color: '#C0392B' },
  rowValue: { fontSize: 12, color: Colors.textTertiary },

  version: { textAlign: 'center', fontSize: 11, color: Colors.textTertiary, marginTop: 16 },

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
  sheetTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  editForm: { gap: 14 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  picker: {
    height: 50, borderRadius: 10,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5, borderColor: Colors.borderMid,
    paddingHorizontal: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: Colors.textTertiary, flex: 1 },
  errorText: { fontSize: 13, color: '#C0392B' },

  // University sheet
  uniSheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  uniOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, paddingHorizontal: 24,
  },
  uniOptionText: { fontSize: 15, color: Colors.textSecondary, flex: 1 },
  uniOptionActive: { color: Colors.purple600, fontWeight: '600' },
})
