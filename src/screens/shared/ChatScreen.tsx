import { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Colors } from '../../constants/colors'
import { Fonts } from '../../constants/fonts'
import { ChatParams } from '../../navigation/types'
import { Message } from '../../types/database.types'

export default function ChatScreen() {
  const route = useRoute<RouteProp<{ Chat: ChatParams }, 'Chat'>>()
  const navigation = useNavigation()
  const { conversationId, headerTitle } = route.params
  const { session } = useAuth()
  const myId = session?.user.id

  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef<FlatList<Message>>(null)

  // Initial load
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      setMessages((data ?? []) as Message[])
      setLoading(false)
    })()
  }, [conversationId])

  // Realtime: append new messages as they arrive.
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        payload => {
          const msg = payload.new as Message
          setMessages(prev => (prev.some(m => m.id === msg.id) ? prev : [...prev, msg]))
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
      setText(body) // restore on failure
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
            ListEmptyComponent={
              <Text style={styles.empty}>Say hello and ask about the listing.</Text>
            }
            renderItem={({ item }) => {
              const mine = item.sender_id === myId
              return (
                <View style={[styles.bubbleRow, mine ? styles.rowMine : styles.rowTheirs]}>
                  <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                    <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.body}</Text>
                  </View>
                </View>
              )
            }}
          />
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Message…"
            placeholderTextColor={Colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
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
  list: { padding: 16, gap: 8, flexGrow: 1 },
  empty: { fontFamily: Fonts.regular, fontSize: 14, color: Colors.textTertiary, textAlign: 'center', marginTop: 24 },

  bubbleRow: { flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: Colors.green600, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: Colors.white, borderBottomLeftRadius: 4, borderWidth: 0.5, borderColor: Colors.borderLight },
  bubbleText: { fontFamily: Fonts.regular, fontSize: 15, color: Colors.textPrimary },
  bubbleTextMine: { color: Colors.white },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
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
