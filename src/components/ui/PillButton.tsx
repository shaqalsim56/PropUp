import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

interface Props {
  title: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

// Long, fully-rounded primary (green) pill button.
export default function PillButton({ title, onPress, loading, disabled, style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.pill, (loading || disabled) && styles.dim, style]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.85}
    >
      {loading
        ? <ActivityIndicator color={Colors.white} />
        : <Text style={styles.label}>{title}</Text>}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  pill: {
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.green600,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.6 },
  label: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.white },
})
