import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { db } from '../../../firebase/config';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
  type?: 'direct' | 'group';
}

export default function ChatListRoute() {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!user?.uid) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', user.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const chatsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Partial<Chat>),
      })) as Chat[];
      setChats(chatsData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const onNewChat = () => router.push('/new');
  const onOpenChat = (chat: Chat) => router.push({ pathname: '/chat/[chatId]', params: { chatId: chat.id, chatName: chat.name } });

  return (
    <View style={styles.container}>
      <Button mode="contained" onPress={onNewChat} style={styles.newChatButton}>
        New Chat
      </Button>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.chatCard} onPress={() => onOpenChat(item)}>
            <Card.Content>
              <Text variant="titleLarge">{item.name}</Text>
              {item.lastMessage && (
                <Text variant="bodyMedium" style={styles.lastMessage}>
                  {item.lastMessage}
                </Text>
              )}
              {item.lastMessageTime && (
                <Text variant="bodySmall" style={styles.time}>
                  {item.lastMessageTime}
                </Text>
              )}
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  newChatButton: { marginBottom: 10 },
  chatCard: { marginBottom: 10 },
  lastMessage: { color: '#666' },
  time: { color: '#999' },
});
