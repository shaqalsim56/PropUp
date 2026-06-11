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
import CreateListingScreen from '../screens/landlord/CreateListingScreen'
import EditListingScreen from '../screens/landlord/EditListingScreen'
import LandlordProfileScreen from '../screens/landlord/LandlordProfileScreen'
import ConversationsScreen from '../screens/shared/ConversationsScreen'
import ChatScreen from '../screens/shared/ChatScreen'
import {
  StudentStackParamList, StudentTabParamList, LandlordStackParamList, LandlordTabParamList,
} from './types'

const StudentStack = createNativeStackNavigator<StudentStackParamList>()
const Tab = createBottomTabNavigator<StudentTabParamList>()
const LandlordStack = createNativeStackNavigator<LandlordStackParamList>()
const LandlordTab = createBottomTabNavigator<LandlordTabParamList>()

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
            Home:     ['home',        'home-outline'],
            Saved:    ['bookmark',    'bookmark-outline'],
            Messages: ['chatbubbles', 'chatbubbles-outline'],
            Profile:  ['person',      'person-outline'],
          }
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline']
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Saved" component={PlaceholderScreen} />
      <Tab.Screen name="Messages" component={ConversationsScreen} />
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
      <StudentStack.Screen name="Chat" component={ChatScreen} />
    </StudentStack.Navigator>
  )
}

function LandlordTabs() {
  return (
    <LandlordTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.green600,
        tabBarInactiveTintColor: Colors.textTertiary,
        tabBarStyle: { backgroundColor: Colors.bgPrimary, borderTopColor: Colors.borderLight },
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, [string, string]> = {
            Listings:  ['home',          'home-outline'],
            Inquiries: ['chatbubbles',   'chatbubbles-outline'],
            Profile:   ['person',        'person-outline'],
          }
          const [active, inactive] = icons[route.name] ?? ['ellipse', 'ellipse-outline']
          return <Ionicons name={(focused ? active : inactive) as any} size={size} color={color} />
        },
      })}
    >
      <LandlordTab.Screen name="Listings" component={DashboardScreen} />
      <LandlordTab.Screen name="Inquiries" component={ConversationsScreen} />
      <LandlordTab.Screen name="Profile" component={LandlordProfileScreen} />
    </LandlordTab.Navigator>
  )
}

function LandlordNavigator() {
  return (
    <LandlordStack.Navigator screenOptions={{ headerShown: false }}>
      <LandlordStack.Screen name="MainTabs" component={LandlordTabs} />
      <LandlordStack.Screen name="CreateListing" component={CreateListingScreen} options={{ animation: 'slide_from_bottom' }} />
      <LandlordStack.Screen name="EditListing" component={EditListingScreen} options={{ animation: 'slide_from_bottom' }} />
      <LandlordStack.Screen name="Chat" component={ChatScreen} />
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
