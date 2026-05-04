import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity, Modal, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../../lib/supabase'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { UNIVERSITIES } from '../../constants/universities'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

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
  const [pendingConfirm, setPendingConfirm] = useState(false)

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

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    // Email confirmation is enabled — session is null until user confirms
    if (data.user && !data.session) {
      setPendingConfirm(true)
    }
    // If session is set, onAuthStateChange fires and RootNavigator redirects automatically
  }

  if (pendingConfirm) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Check your email</Text>
          <Text style={styles.confirmBody}>
            We sent a confirmation link to{' '}
            <Text style={{ fontWeight: '600' }}>{email.trim().toLowerCase()}</Text>
            {'. Tap it to activate your account.'}
          </Text>
          <Button
            title="Back to login"
            variant="purple"
            onPress={() => navigation.navigate('Login')}
          />
        </View>
      </SafeAreaView>
    )
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.back}>← Back</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Create student account</Text>

          <View style={styles.form}>
            <Input
              label="Full name"
              placeholder="Jane Brown"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              placeholder="jane@utech.edu.jm"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Min 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>University</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setShowPicker(true)}>
                <Text style={university ? styles.pickerValue : styles.pickerPlaceholder}>
                  {university || 'Select your university'}
                </Text>
                <Text style={styles.caret}>▾</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Create account"
              variant="purple"
              onPress={handleSignUp}
              loading={loading}
            />

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={showPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        />
        <View style={styles.sheet}>
          <Text style={styles.sheetTitle}>Select university</Text>
          <FlatList
            data={UNIVERSITIES}
            keyExtractor={item => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={() => { setUniversity(item); setShowPicker(false) }}
              >
                <Text style={[
                  styles.sheetOptionText,
                  item === university && styles.sheetOptionActive,
                ]}>
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
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  container: { padding: 24, paddingBottom: 40 },
  confirmBox: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  confirmTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  confirmBody: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  back: { fontSize: 14, color: Colors.purple600, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24 },
  form: { gap: 14 },
  fieldGroup: { gap: 4 },
  fieldLabel: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  picker: {
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5,
    borderColor: Colors.borderMid,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerValue: { fontSize: 15, color: Colors.textPrimary, flex: 1 },
  pickerPlaceholder: { fontSize: 15, color: Colors.textTertiary, flex: 1 },
  caret: { fontSize: 13, color: Colors.textTertiary },
  error: { fontSize: 13, color: '#C0392B' },
  loginLink: { textAlign: 'center', fontSize: 13, color: Colors.textTertiary, paddingVertical: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  sheet: {
    backgroundColor: Colors.bgPrimary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingBottom: 40,
    maxHeight: '60%',
  },
  sheetTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingBottom: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    marginBottom: 4,
  },
  sheetOption: { paddingVertical: 14, paddingHorizontal: 24 },
  sheetOptionText: { fontSize: 15, color: Colors.textSecondary },
  sheetOptionActive: { color: Colors.purple600, fontWeight: '600' },
})
