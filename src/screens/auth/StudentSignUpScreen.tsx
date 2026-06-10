import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { UNIVERSITIES } from '../../constants/universities'
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn'
import IconInput from '../../components/ui/IconInput'
import PillButton from '../../components/ui/PillButton'
import GoogleButton from '../../components/ui/GoogleButton'

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'StudentSignUp'>
}

export default function StudentSignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [university, setUniversity] = useState('')
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const google = useGoogleSignIn()

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || !password || !university) {
      setError('Please fill in all fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), role: 'student' } },
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    // Instant session (email confirmation disabled) — save the university.
    if (data.user && data.session) {
      await supabase.from('profiles').update({ university }).eq('id', data.user.id)
    }

    setLoading(false)
    // onAuthStateChange handles navigation from here.
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.black} />
          </TouchableOpacity>

          <Text style={styles.title}>Create Your Account</Text>
          <Text style={styles.subtitle}>Best Way to Find Rentals Near your Campus</Text>

          <View style={styles.form}>
            <IconInput
              label="Full Name"
              icon="person-outline"
              placeholder="Enter Full Name"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <IconInput
              label="Email Address"
              icon="mail-outline"
              placeholder="Enter Your Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <IconInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter Your Password"
              value={password}
              onChangeText={setPassword}
              secure
            />

            {/* University */}
            <View style={styles.field}>
              <Text style={styles.label}>University</Text>
              <TouchableOpacity style={styles.box} onPress={() => setShowPicker(true)}>
                <Ionicons name="school-outline" size={20} color={Colors.textSecondary} />
                <Text style={university ? styles.boxValue : styles.boxPlaceholder} numberOfLines={1}>
                  {university || 'Select your university'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {error || google.error
              ? <Text style={styles.error}>{error || google.error}</Text>
              : null}

            <PillButton title="Create Account" onPress={handleSignUp} loading={loading} />

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={google.signIn} loading={google.loading} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.footerLink}> Log in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* University picker */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShowPicker(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Select university</Text>
          <FlatList
            data={UNIVERSITIES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setUniversity(item); setShowPicker(false) }}
              >
                <Text style={[styles.sheetOptionText, item === university && styles.sheetOptionActive]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.white },
  container: { padding: 24, paddingBottom: 40 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', marginLeft: -8, marginBottom: 12 },

  title: { fontFamily: Fonts.bold, fontSize: 32, color: Colors.black },
  subtitle: {
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.textSecondary,
    marginTop: 6,
    marginBottom: 28,
  },

  form: { gap: 18 },
  field: { gap: 8 },
  label: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.black },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: 16,
  },
  boxValue: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: Colors.black },
  boxPlaceholder: { flex: 1, fontFamily: Fonts.regular, fontSize: 15, color: Colors.textTertiary },

  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dividerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },
  footerLink: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600 },

  // University sheet
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderMid,
    marginBottom: 12,
  },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: 17,
    color: Colors.black,
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
  },
  sheetOption: { paddingVertical: 14, paddingHorizontal: 24 },
  sheetOptionText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textSecondary },
  sheetOptionActive: { fontFamily: Fonts.bold, color: Colors.green600 },
})
