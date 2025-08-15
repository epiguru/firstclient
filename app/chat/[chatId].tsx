import React, { useEffect, useRef, useState } from 'react';
import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { XStack, Text } from 'tamagui';

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

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = firestore()
      .collection('chats')
      .doc(String(chatId))
      .collection('messages')
      .orderBy('createdAt', 'desc')
      .onSnapshot((querySnapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        const messagesData = querySnapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({ _id: doc.id, ...(doc.data() as any) }));
        setMessages(messagesData as Message[]);
      });
    return () => unsubscribe();
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
      await firestore()
        .collection('chats')
        .doc(String(chatId))
        .collection('messages')
        .add({
          text: m.text,
          createdAt: firestore.FieldValue.serverTimestamp(),
          user: { _id: String(user?.uid), name: user?.email || 'Anonymous' },
        });
    } catch (e) {
      console.error('Error sending message:', e);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title }} />
      {flash?.visible ? (
        <XStack px={12} py={10} bg="#FFF4E5" borderBottomWidth={1} borderColor="#F0D2A6" ai="center" jc="center">
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
