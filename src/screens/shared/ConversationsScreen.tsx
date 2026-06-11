import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { ConversationWithDetails } from '../../types/database.types'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function ConversationsScreen() {
  const navigation = useNavigation<any>()
  const { profile, session } = useAuth()
  const isLandlord = profile?.role === 'landlord'
  const [convos, setConvos] = useState<ConversationWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConvos = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('conversations')
      .select('*, listings(title), student:profiles!conversations_student_id_fkey(full_name), landlord:profiles!conversations_landlord_id_fkey(full_name)')
      .order('last_message_at', { ascending: false })
    setConvos((data ?? []) as ConversationWithDetails[])
    setLoading(false)
  }, [session])

  useFocusEffect(useCallback(() => { fetchConvos() }, [fetchConvos]))

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>{isLandlord ? 'Inquiries' : 'Messages'}</Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={Colors.green600} /></View>
      ) : convos.length === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIcon}><Ionicons name="chatbubbles-outline" size={30} color={Colors.green600} /></View>
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptyBody}>
            {isLandlord
              ? 'When a student inquires about a listing, it will show up here.'
              : 'Message a landlord from a listing to start a conversation.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={convos}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const otherName = (isLandlord ? item.student?.full_name : item.landlord?.full_name) ?? 'User'
            const listingTitle = item.listings?.title ?? 'Listing'
            const initial = otherName.charAt(0).toUpperCase()
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id, headerTitle: otherName })}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={1}>{otherName}</Text>
                  <Text style={styles.rowListing} numberOfLines={1}>{listingTitle}</Text>
                </View>
                <Text style={styles.rowTime}>{timeAgo(item.last_message_at)}</Text>
              </TouchableOpacity>
            )
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  title: { fontFamily: Fonts.bold, fontSize: 24, color: Colors.black },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 8 },
  emptyIcon: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.green50,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.black },
  emptyBody: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  list: { padding: 16, gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: Colors.bgPrimary,
    borderWidth: 0.5,
    borderColor: Colors.borderLight,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.green600,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.white },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontFamily: Fonts.bold, fontSize: 15, color: Colors.textPrimary },
  rowListing: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },
  rowTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary },
})
