import { View, ViewProps } from 'react-native'

// Web stub for react-native-maps, which has no web implementation.
// Maps render as an empty box on web; native uses the real library.
export const PROVIDER_GOOGLE = 'google'
export const PROVIDER_DEFAULT = undefined

export function Marker(_props: any) {
  return null
}

export default function MapView(props: ViewProps) {
  return <View {...props} />
}
