import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

interface Props {
  onPress: () => void
  loading?: boolean
  disabled?: boolean
}

// White, outlined pill with the Google logo — "Continue with Google".
export default function GoogleButton({ onPress, loading, disabled }: Props) {
  return (
    <TouchableOpacity
      style={styles.pill}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={Colors.black} />
        : (
          <>
            <Ionicons name="logo-google" size={20} color={Colors.black} />
            <Text style={styles.label}>Continue with Google</Text>
          </>
        )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.borderMid,
  },
  label: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.black },
})
