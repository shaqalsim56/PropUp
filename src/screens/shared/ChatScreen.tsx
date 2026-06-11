import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { ChatParams } from '../../navigation/types'
import { Message } from '../../types/database.types'

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export default function ChatScreen() {
  const route = useRoute<RouteProp<{ Chat: ChatParams }, 'Chat'>>()
  const navigation = useNavigation()
  const insets = useSafeAreaInsets()
  const { conversationId, headerTitle } = route.params
  const { session } = useAuth()
  const myId = session?.user.id

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [otherLastRead, setOtherLastRead] = useState<string | null>(null)
  const amStudent = useRef<boolean>(true)
  const listRef = useRef<FlatList<Message>>(null)

  async function markRead() {
    await supabase.rpc('mark_conversation_read', { p_conversation_id: conversationId })
  }

  // Initial load: messages + who's who + read state.
  useEffect(() => {
    (async () => {
      const [{ data: msgs }, { data: conv }] = await Promise.all([
        supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true }),
        supabase.from('conversations').select('student_id, student_last_read_at, landlord_last_read_at').eq('id', conversationId).single(),
      ])
      setMessages((msgs ?? []) as Message[])
      if (conv) {
        amStudent.current = conv.student_id === myId
        setOtherLastRead(amStudent.current ? conv.landlord_last_read_at : conv.student_last_read_at)
      }
      setLoading(false)
      markRead()
    })()
  }, [conversationId])

  // Realtime: new messages + the other participant's read updates.
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const msg = payload.new as Message
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
          if (msg.sender_id !== myId) markRead()
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${conversationId}` },
        payload => {
          const c = payload.new as { student_last_read_at: string | null; landlord_last_read_at: string | null }
          setOtherLastRead(amStudent.current ? c.landlord_last_read_at : c.student_last_read_at)
        },
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  useEffect(() => {
    if (messages.length) listRef.current?.scrollToEnd({ animated: true })
  }, [messages.length])

  async function send() {
    const body = text.trim()
    if (!body || !myId) return
    setSending(true)
    setText('')
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, sender_id: myId, body })
      .select()
      .single()
    if (error) {
      setText(body)
    } else if (data) {
      setMessages(prev => (prev.some(m => m.id === data.id) ? prev : [...prev, data as Message]))
    }
    setSending(false)
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={Colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{headerTitle}</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {loading ? (
          <View style={styles.center}><ActivityIndicator color={Colors.green600} /></View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListEmptyComponent={<Text style={styles.empty}>Say hello and ask about the listing.</Text>}
            renderItem={({ item, index }) => {
              const mine = item.sender_id === myId
              const isLast = index === messages.length - 1
              const seen = !!(mine && isLast && otherLastRead && new Date(otherLastRead) >= new Date(item.created_at))
              return (
                <View style={[styles.msgRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {seen ? `Seen · ${formatTime(item.created_at)}` : formatTime(item.created_at)}
                  </Text>
                </View>
              )
            }}
          />
        )}

        <View style={[styles.inputBar, { paddingBottom: insets.bottom + 10 }]}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={Colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            autoCorrect
            spellCheck
            autoCapitalize="sentences"
            keyboardType="default"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() || sending) && styles.sendBtnDim]}
            onPress={send}
            disabled={!text.trim() || sending}
          >
            <Ionicons name="arrow-up" size={20} color={Colors.white} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bgPage },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  headerTitle: { flex: 1, fontFamily: Fonts.bold, fontSize: 17, color: Colors.black },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary, textAlign: 'center', marginTop: 24 },

  msgRow: { maxWidth: '82%' },
  rowMine: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  rowTheirs: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: Colors.green600, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: Colors.borderLight },
  bubbleText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  bubbleTextMine: { color: Colors.white },
  meta: { fontFamily: Fonts.regular, fontSize: 10, color: Colors.textTertiary, marginTop: 3, marginHorizontal: 4 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 0.5,
    borderTopColor: Colors.borderLight,
    backgroundColor: Colors.white,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: Colors.bgTertiary,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontFamily: Fonts.regular,
    fontSize: 15,
    color: Colors.black,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.green600,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDim: { opacity: 0.4 },
})
