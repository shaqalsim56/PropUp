import { useState } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as Location from 'expo-location'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import Button from '../../components/ui/Button'

interface Props {
  onComplete: () => void
}

export default function LocationPermissionScreen({ onComplete }: Props) {
  const { session, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)

  // Kingston city centre — default when location is skipped or denied
  const KINGSTON = { campus_lat: 17.997, campus_lng: -76.794 }

  async function saveLocation(lat: number, lng: number) {
    await supabase
      .from('profiles')
      .update({ campus_lat: lat, campus_lng: lng })
      .eq('id', session!.user.id)
    await refreshProfile()
  }

  async function handleAllow() {
    setLoading(true)
    const { status } = await Location.requestForegroundPermissionsAsync()

    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({})
      await saveLocation(loc.coords.latitude, loc.coords.longitude)
    } else {
      await saveLocation(KINGSTON.campus_lat, KINGSTON.campus_lng)
    }

    setLoading(false)
    onComplete()
  }

  async function handleSkip() {
    await saveLocation(KINGSTON.campus_lat, KINGSTON.campus_lng)
    onComplete()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>📍</Text>
        </View>
        <Text style={styles.title}>Allow location access</Text>
        <Text style={styles.description}>
          PropUp uses GPS to show rentals and events near your campus
        </Text>
      </View>

      <View style={styles.actions}>
        <Button
          title="Allow location"
          variant="purple"
          onPress={handleAllow}
          loading={loading}
        />
        <Button
          title="Not now"
          variant="outline"
          onPress={handleSkip}
          disabled={loading}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.purple50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  icon: { fontSize: 36 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  actions: { gap: 12 },
})
