import { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, KeyboardAvoidingView,
  Platform, TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { useGoogleSignIn } from '../../hooks/useGoogleSignIn'
import IconInput from '../../components/ui/IconInput'
import PillButton from '../../components/ui/PillButton'
import GoogleButton from '../../components/ui/GoogleButton'

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const google = useGoogleSignIn()

  async function handleLogin() {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    setLoading(false)

    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Incorrect email or password.'
        : error.message
      )
      return
    }

    setSuccess(true)
    // onAuthStateChange fires and RootNavigator redirects automatically
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

          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Best Way to Find Rentals Near your Campus</Text>

          <View style={styles.form}>
            <IconInput
              label="Email Address"
              icon="mail-outline"
              placeholder="Enter Your Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              editable={!success}
            />
            <IconInput
              label="Password"
              icon="lock-closed-outline"
              placeholder="Enter Your Password"
              value={password}
              onChangeText={setPassword}
              secure
              editable={!success}
            />

            {error || google.error
              ? <Text style={styles.error}>{error || google.error}</Text>
              : null}

            {success ? (
              <View style={styles.successPill}>
                <Text style={styles.successText}>✓  Logged in successfully</Text>
              </View>
            ) : (
              <PillButton title="Log In" onPress={handleLogin} loading={loading} />
            )}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <GoogleButton onPress={google.signIn} loading={google.loading} disabled={success} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('StudentSignUp')}>
                <Text style={styles.footerLink}> Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  error: { fontFamily: Fonts.regular, fontSize: 13, color: '#C0392B' },

  successPill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green50,
    borderWidth: 1,
    borderColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successText: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.green600 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dividerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },
  footerLink: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600 },
})
