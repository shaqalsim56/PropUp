import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { supabase } from '../../lib/supabase'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'LandlordSignUp'>
}

export default function LandlordSignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingConfirm, setPendingConfirm] = useState(false)

  async function handleSignUp() {
    if (!fullName.trim() || !email.trim() || !password) {
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
      options: { data: { full_name: fullName.trim(), role: 'landlord' } },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    if (data.user && !data.session) {
      setPendingConfirm(true)
    }
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
            variant="green"
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

          <Text style={styles.title}>Create landlord account</Text>

          <View style={styles.form}>
            <Input
              label="Full name"
              placeholder="Michael Brown"
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
            />
            <Input
              label="Email"
              placeholder="landlord@gmail.com"
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

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Create account"
              variant="green"
              onPress={handleSignUp}
              loading={loading}
            />

            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Already have an account? Log in</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  container: { padding: 24, paddingBottom: 40 },
  confirmBox: { flex: 1, padding: 24, justifyContent: 'center', gap: 16 },
  confirmTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  confirmBody: { fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },
  back: { fontSize: 14, color: Colors.green600, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24 },
  form: { gap: 14 },
  error: { fontSize: 13, color: '#C0392B' },
  loginLink: { textAlign: 'center', fontSize: 13, color: Colors.textTertiary, paddingVertical: 4 },
})
