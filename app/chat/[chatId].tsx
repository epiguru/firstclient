import React, { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { GiftedChat } from 'react-native-gifted-chat';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';

interface Message {
  _id: string;
  text: string;
  createdAt: Date;
  user: { _id: string; name: string };
}

export default function ChatRoute() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!chatId) return;
    const unsubscribe = db
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

  const onSend = async (newMessages: Message[]) => {
    const m = newMessages[0];
    try {
      await db
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
