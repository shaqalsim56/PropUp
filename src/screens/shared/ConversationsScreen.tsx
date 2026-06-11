import { useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'

interface ConversationListItem {
  id: string
  listing_id: string
  listing_title: string | null
  other_name: string | null
  is_landlord: boolean
  last_message: string | null
  last_message_at: string
  unread_count: number
}

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
  const [convos, setConvos] = useState<ConversationListItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConvos = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.rpc('get_conversations')
    setConvos((data ?? []) as ConversationListItem[])
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
            const otherName = item.other_name ?? 'User'
            const initial = otherName.charAt(0).toUpperCase()
            const unread = item.unread_count > 0
            const preview = item.last_message
              ?? `About: ${item.listing_title ?? 'listing'}`
            return (
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Chat', { conversationId: item.id, headerTitle: otherName })}
              >
                <View style={styles.avatar}><Text style={styles.avatarText}>{initial}</Text></View>
                <View style={styles.rowBody}>
                  <Text style={[styles.rowName, unread && styles.bold]} numberOfLines={1}>{otherName}</Text>
                  <Text style={[styles.rowPreview, unread && styles.previewUnread]} numberOfLines={1}>
                    {preview}
                  </Text>
                </View>
                <View style={styles.rowEnd}>
                  <Text style={styles.rowTime}>{timeAgo(item.last_message_at)}</Text>
                  {unread && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
                    </View>
                  )}
                </View>
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
    width: 46, height: 46, borderRadius: 23, backgroundColor: Colors.green600,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontFamily: Fonts.bold, fontSize: 18, color: Colors.white },
  rowBody: { flex: 1, gap: 2 },
  rowName: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  bold: { fontFamily: Fonts.bold },
  rowPreview: { fontFamily: Fonts.regular, fontSize: 13, color: Colors.textTertiary },
  previewUnread: { color: Colors.textPrimary, fontFamily: Fonts.bold },
  rowEnd: { alignItems: 'flex-end', gap: 6 },
  rowTime: { fontFamily: Fonts.regular, fontSize: 12, color: Colors.textTertiary },
  badge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: Colors.green600, alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { fontFamily: Fonts.bold, fontSize: 11, color: Colors.white },
})
