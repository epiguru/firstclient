import React, { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import firestore from '@react-native-firebase/firestore';
import { useAuth } from '../../../contexts/AuthContext';
import { XStack, Text } from 'tamagui';
import { messageConverter, toGiftedChatMessage } from '@shared/schemas/message';

interface Message {
  _id: string;
  text: string;
  createdAt: Date;
  user: { _id: string; name: string };
  moderation?: { flagged?: boolean; checked?: boolean; reason?: string };
}

export default function ChatRoute() {
  const { chatId, chatName } = useLocalSearchParams<{ chatId: string; chatName?: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [flash, setFlash] = useState<{ visible: boolean; reason?: string } | null>(null);
  const warnedIdsRef = useRef<Set<string>>(new Set());
  const [title, setTitle] = useState<string>(chatName || 'Chat');

  // Ensure the header title reflects the chat name. Prefer param, fallback to Firestore.
  useEffect(() => {
    if (chatName) {
      setTitle(chatName);
      return;
    }
    if (!chatId) return;
    let cancelled = false;
    (async () => {
      try {
        const doc = await firestore().collection('chats').doc(String(chatId)).get();
        const data = doc.data() as any;
        if (!cancelled && data?.name) setTitle(String(data.name));
      } catch (e) {
        // noop
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chatId, chatName]);

  // Subscribe to messages using Firestore converter
  useEffect(() => {
    if (!chatId) return;
    const col = (firestore()
      .collection('chats')
      .doc(String(chatId))
      .collection('messages') as any).withConverter(messageConverter as any);
    const q = (col as any).orderBy('createdAt', 'desc');
    const unsub = (q as any).onSnapshot((snap: any) => {
      const items = snap.docs.map((d: any) => toGiftedChatMessage(d.data()));
      setMessages(items as any);
    });
    return () => unsub();
  }, [chatId]);

  // Show a flash banner if the user's most recent message is flagged
  useEffect(() => {
    if (!user?.uid || !messages.length) return;
    const mine = messages.find((m) => m.user?._id === String(user.uid));
    if (!mine) return;
    if (mine.moderation?.flagged && !warnedIdsRef.current.has(mine._id)) {
      warnedIdsRef.current.add(mine._id);
      setFlash({ visible: true, reason: mine.moderation?.reason });
      const t = setTimeout(() => setFlash((f) => (f ? { ...f, visible: false } : null)), 5000);
      return () => clearTimeout(t);
    }
  }, [messages, user?.uid]);

  const onSend = async (newMessages: Message[]) => {
    const m = newMessages[0];
    try {
      const chatRef = firestore().collection('chats').doc(String(chatId));
      // Add message
      await chatRef.collection('messages').add({
        text: m.text,
        createdAt: firestore.FieldValue.serverTimestamp(),
        user: { _id: String(user?.uid), name: user?.displayName || user?.email || 'Anonymous' },
        userId: String(user?.uid),
        userName: user?.displayName || user?.email || 'Anonymous',
      } as any);
      // Update last message preview on chat
      await chatRef.set(
        {
          lastMessage: m.text,
          lastMessageTime: firestore.FieldValue.serverTimestamp(),
          lastMessageUserId: String(user?.uid),
          lastMessageUserName: user?.displayName || user?.email || 'Anonymous',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        } as any,
        { merge: true }
      );
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      {flash?.visible ? (
        <XStack px={12} py={10} bg="#FFF4E5" borderBottomWidth={1} borderColor="#F0D2A6" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <Text color="#8A4B0F" fontWeight="700">
            Your message was flagged by our moderation system{flash.reason ? `: ${flash.reason}` : '.'}
          </Text>
        </XStack>
      ) : null}
      <GiftedChat
        messages={messages}
        onSend={(msgs) => onSend(msgs as any)}
        user={{ _id: String(user?.uid), name: user?.email || 'Anonymous' }}
        placeholder="Type a message..."
        alwaysShowSend
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
