import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'

export default function DashboardScreen() {
  const { profile } = useAuth()

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.greeting}>Welcome, {profile?.full_name?.split(' ')[0]}</Text>
      <Text style={styles.sub}>Landlord dashboard coming next</Text>
      <TouchableOpacity style={styles.signOut} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 14, color: Colors.textSecondary },
  signOut: { marginTop: 24, paddingVertical: 10, paddingHorizontal: 24 },
  signOutText: { fontSize: 14, color: Colors.green600, fontWeight: '500' },
})
