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
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>
}

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    }
    // On success, onAuthStateChange fires and RootNavigator redirects automatically
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

          <Text style={styles.title}>Log in</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="you@email.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
            />
            <Input
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              title="Log in"
              variant="purple"
              onPress={handleLogin}
              loading={loading}
            />

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
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  container: { padding: 24, paddingBottom: 40 },
  back: { fontSize: 14, color: Colors.purple600, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 24 },
  form: { gap: 14 },
  error: { fontSize: 13, color: '#C0392B' },
  footer: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 4 },
  footerText: { fontSize: 13, color: Colors.textTertiary },
  footerLink: { fontSize: 13, color: Colors.purple600, fontWeight: '500' },
})
