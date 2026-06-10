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
  navigation: NativeStackNavigationProp<AuthStackParamList, 'LandlordSignUp'>
}

export default function LandlordSignUpScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const google = useGoogleSignIn()

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

    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: { data: { full_name: fullName.trim(), role: 'landlord' } },
    })

    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }
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
          <Text style={styles.subtitle}>List your rentals and reach students near campus</Text>

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

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.borderLight },
  dividerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },

  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },
  footerLink: { fontFamily: Fonts.bold, fontSize: 13, color: Colors.green600 },
})
