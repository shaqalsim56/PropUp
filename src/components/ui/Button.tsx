import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native'
import { Colors } from '../../constants/colors'

type Variant = 'purple' | 'green' | 'pink' | 'outline'

interface Props {
  title: string
  onPress: () => void
  variant?: Variant
  loading?: boolean
  disabled?: boolean
  style?: ViewStyle
}

const BG: Record<Variant, string> = {
  purple: Colors.purple600,
  green: Colors.green600,
  pink: Colors.pink600,
  outline: 'transparent',
}

const FG: Record<Variant, string> = {
  purple: Colors.purple50,
  green: Colors.green50,
  pink: Colors.pink50,
  outline: Colors.textSecondary,
}

export default function Button({ title, onPress, variant = 'purple', loading = false, disabled = false, style }: Props) {
  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: BG[variant] },
        variant === 'outline' && styles.outline,
        (loading || disabled) && styles.dimmed,
        style,
      ]}
      onPress={onPress}
      disabled={loading || disabled}
      activeOpacity={0.8}
    >
      {loading
        ? <ActivityIndicator color={variant === 'outline' ? Colors.textSecondary : '#fff'} />
        : <Text style={[styles.label, { color: FG[variant] }]}>{title}</Text>
      }
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  btn: {
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    borderWidth: 1,
    borderColor: Colors.borderMid,
  },
  dimmed: { opacity: 0.6 },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
})
