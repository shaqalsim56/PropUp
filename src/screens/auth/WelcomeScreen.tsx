import { useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Pressable,
  Image,
  useWindowDimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { AuthStackParamList } from '../../navigation/types'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Welcome'>
}

// Slide 1 is the real copy. Slides 2 & 3 are placeholders — edit later.
const SLIDES = [
  {
    key: 'start',
    heading: 'Get Started!',
    subtext: 'Best Way to Find Rentals Near your Campus',
  },
  {
    key: 'slide-2',
    heading: 'Placeholder Title',
    subtext: 'Placeholder subtitle text goes here — edit me later.',
  },
  {
    key: 'slide-3',
    heading: 'Placeholder Title',
    subtext: 'Placeholder subtitle text goes here — edit me later.',
  },
]

export default function WelcomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions()
  const scrollX = useRef(new Animated.Value(0)).current
  const [roleModal, setRoleModal] = useState(false)

  const chooseRole = (route: 'StudentSignUp' | 'LandlordSignUp') => {
    setRoleModal(false)
    navigation.navigate(route)
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.carousel}>
        <Animated.FlatList
          data={SLIDES}
          keyExtractor={(item) => item.key}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { x: scrollX } } }],
            { useNativeDriver: false },
          )}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width }]}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />
              <Text style={styles.heading}>{item.heading}</Text>
              <Text style={styles.subtext}>{item.subtext}</Text>
            </View>
          )}
        />
      </View>

      <View style={styles.dots}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * width, i * width, (i + 1) * width]
          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 22, 8],
            extrapolate: 'clamp',
          })
          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          })
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width: dotWidth, opacity }]}
            />
          )
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.pill, styles.pillFilled]}
          activeOpacity={0.85}
          onPress={() => setRoleModal(true)}
        >
          <Text style={[styles.pillLabel, styles.pillLabelFilled]}>Sign Up</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, styles.pillOutline]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.pillLabel, styles.pillLabelOutline]}>Log In</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={roleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleModal(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRoleModal(false)}>
          <Pressable style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Sign up as</Text>

            <TouchableOpacity
              style={[styles.pill, styles.pillFilled, styles.sheetPill]}
              activeOpacity={0.85}
              onPress={() => chooseRole('StudentSignUp')}
            >
              <Text style={[styles.pillLabel, styles.pillLabelFilled]}>I'm a Student</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pill, styles.pillOutline, styles.sheetPill]}
              activeOpacity={0.85}
              onPress={() => chooseRole('LandlordSignUp')}
            >
              <Text style={[styles.pillLabel, styles.pillLabelOutline]}>I'm a Landlord</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingBottom: 24,
  },
  carousel: {
    flex: 1,
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  heading: {
    fontFamily: Fonts.bold,
    fontSize: 38,
    color: Colors.black,
    textAlign: 'center',
  },
  subtext: {
    fontFamily: Fonts.regular,
    fontSize: 18,
    color: Colors.black,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 24,
  },
  logo: {
    width: 200,
    height: 200,
    marginBottom: 24,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 28,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.brand,
  },
  actions: {
    paddingHorizontal: 24,
    gap: 14,
  },
  pill: {
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillFilled: {
    backgroundColor: Colors.brand,
  },
  pillOutline: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.brand,
  },
  pillLabel: {
    fontFamily: Fonts.bold,
    fontSize: 16,
  },
  pillLabelFilled: {
    color: Colors.white,
  },
  pillLabelOutline: {
    color: Colors.brand,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 14,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginBottom: 8,
  },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: 20,
    color: Colors.black,
    textAlign: 'center',
    marginBottom: 4,
  },
  sheetPill: {
    marginTop: 0,
  },
})
