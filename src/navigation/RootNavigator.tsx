import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../context/AuthContext'
import { Colors } from '../constants/colors'
import AuthNavigator from './AuthNavigator'
import LocationPermissionScreen from '../screens/auth/LocationPermissionScreen'
import HomeScreen from '../screens/student/HomeScreen'
import ListingDetailScreen from '../screens/student/ListingDetailScreen'
import ProfileScreen from '../screens/student/ProfileScreen'
import DashboardScreen from '../screens/landlord/DashboardScreen'
import { StudentStackParamList, StudentTabParamList, LandlordStackParamList } from './types'

const StudentStack = createNativeStackNavigator<StudentStackParamList>()
const Tab = createBottomTabNavigator<StudentTabParamList>()
const LandlordStack = createNativeStackNavigator<LandlordStackParamList>()

function PlaceholderScreen() {
  return <View style={{ flex: 1, backgroundColor: Colors.bgPage }} />
}

function StudentTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.green600,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: { backgroundColor: Colors.bgPrimary, borderTopColor: Colors.borderLight },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Home:    ['home',     'home-outline'],
            Events:  ['calendar', 'calendar-outline'],
            Saved:   ['bookmark', 'bookmark-outline'],
            Profile: ['person',   'person-outline'],
          }
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline']
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Events" component={PlaceholderScreen} />
      <Tab.Screen name="Saved" component={PlaceholderScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}

function StudentNavigator() {
  return (
    <StudentStack.Navigator screenOptions={{ headerShown: false }}>
      <StudentStack.Screen name="MainTabs" component={StudentTabs} />
      <StudentStack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </StudentStack.Navigator>
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

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={Colors.green600} size="large" />
      </View>
    )
  }

  if (!session || !profile) return <AuthNavigator />

  // Shown once — both "Allow" and "Not now" write campus_lat to the DB,
  // so this gate never triggers again for the same user after that.
  if (profile.role === 'student' && !profile.campus_lat) {
    return <LocationPermissionScreen onComplete={() => {}} />
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
