import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import Button from '../../components/ui/Button'

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>
}

export default function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>PropUp</Text>
        <Text style={styles.tagline}>Rentals near campus</Text>
      </View>

      <View style={styles.illustration} />

      <View style={styles.actions}>
        <Button
          title="Sign up as student"
          variant="purple"
          onPress={() => navigation.navigate('StudentSignUp')}
        />
        <Button
          title="I'm a landlord"
          variant="outline"
          onPress={() => navigation.navigate('LandlordSignUp')}
        />
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgPage,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  hero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  logo: {
    fontSize: 38,
    fontWeight: '700',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 6,
  },
  illustration: {
    flex: 1,
    backgroundColor: Colors.purple50,
    borderRadius: 20,
    marginBottom: 32,
  },
  actions: {
    gap: 12,
  },
  loginLink: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.textTertiary,
    paddingVertical: 4,
  },
})
