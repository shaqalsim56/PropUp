import 'react-native-gesture-handler'
import { Text, TextInput } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { useFonts, Arimo_400Regular, Arimo_700Bold } from '@expo-google-fonts/arimo'
import { AuthProvider } from './src/context/AuthContext'
import { Fonts } from './src/constants/fonts'
import RootNavigator from './src/navigation/RootNavigator'

// Default every Text / TextInput to Arimo (regular). Bold styles opt into
// Fonts.bold explicitly — custom fonts don't bold via fontWeight on Android.
const setDefaultFont = (Component: typeof Text | typeof TextInput) => {
  const c = Component as unknown as { defaultProps?: { style?: unknown } }
  c.defaultProps = c.defaultProps || {}
  c.defaultProps.style = [{ fontFamily: Fonts.regular }, c.defaultProps.style]
}
setDefaultFont(Text)
setDefaultFont(TextInput)

export default function App() {
  const [fontsLoaded] = useFonts({ Arimo_400Regular, Arimo_700Bold })

  if (!fontsLoaded) return null

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
