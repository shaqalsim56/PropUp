import { useState } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import AuthNavigator from './AuthNavigator'
import LocationPermissionScreen from '../screens/auth/LocationPermissionScreen'
import HomeScreen from '../screens/student/HomeScreen'
import DashboardScreen from '../screens/landlord/DashboardScreen'
import { StudentTabParamList, LandlordStackParamList } from './types'

const Tab = createBottomTabNavigator<StudentTabParamList>()
const LandlordStack = createNativeStackNavigator<LandlordStackParamList>()

function PlaceholderScreen() {
  return <View style={{ flex: 1, backgroundColor: Colors.bgPage }} />
}

function StudentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.purple600,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: { backgroundColor: Colors.bgPrimary, borderTopColor: Colors.borderLight },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Events" component={PlaceholderScreen} />
      <Tab.Screen name="Saved" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={PlaceholderScreen} />
    </Tab.Navigator>
  )
}

function LandlordNavigator() {
  return (
    <LandlordStack.Navigator screenOptions={{ headerShown: false }}>
      <LandlordStack.Screen name="Dashboard" component={DashboardScreen} />
    </LandlordStack.Navigator>
  )
}

export default function RootNavigator() {
  const { session, profile, loading } = useAuth()
  const [locationDone, setLocationDone] = useState(false)

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.purple600} size="large" />
      </View>
    )
  }

  if (!session || !profile) return <AuthNavigator />

  if (profile.role === 'student' && !profile.campus_lat && !locationDone) {
    return (
      <LocationPermissionScreen onComplete={() => setLocationDone(true)} />
    )
  }

  if (profile.role === 'landlord') return <LandlordNavigator />

  return <StudentNavigator />
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: Colors.bgPage,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
