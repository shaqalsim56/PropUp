import { useState } from 'react'
import { View, Text, TextInput, StyleSheet, TouchableOpacity, TextInputProps } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

interface Props extends TextInputProps {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  secure?: boolean
}

// Borderless, rounded, filled input with a leading icon — matches the login design.
export default function IconInput({ label, icon, secure, ...props }: Props) {
  const [hidden, setHidden] = useState(true)

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.box}>
        <Ionicons name={icon} size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.textTertiary}
          autoCapitalize="none"
          secureTextEntry={secure ? hidden : false}
          {...props}
        />
        {secure && (
          <TouchableOpacity onPress={() => setHidden(h => !h)} hitSlop={8}>
            <Ionicons
              name={hidden ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={Colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  field: { gap: 8 },
  label: { fontFamily: Fonts.bold, fontSize: 16, color: Colors.black },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 56,
    borderRadius: 18,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black,
  },
})
