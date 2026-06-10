import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

interface Props extends TextInputProps {
  label: string
}

export default function Input({ label, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={Colors.textTertiary}
        autoCapitalize="none"
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 4 },
  label: { fontFamily: Fonts.regular,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  input: { fontFamily: Fonts.regular,
    height: 50,
    borderRadius: 10,
    backgroundColor: Colors.bgSecondary,
    borderWidth: 0.5,
    borderColor: Colors.borderMid,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.textPrimary,
  },
})
