import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import React, { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { YStack, Button, Card, Text, XStack, ScrollView } from 'tamagui';

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
    const unsubscribe = firestore()
      .collection('chats')
      .where('participants', 'array-contains', user.uid)
      .onSnapshot((querySnapshot: FirebaseFirestoreTypes.QuerySnapshot) => {
        const chatsData = querySnapshot.docs.map((doc: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
          id: doc.id,
          ...(doc.data() as Partial<Chat>),
        })) as Chat[];
        setChats(chatsData);
      });

    return () => unsubscribe();
  }, [user?.uid]);

  const onOpenChat = (chat: Chat) => router.push({ pathname: '/(tabs)/chat/[chatId]', params: { chatId: chat.id, chatName: chat.name } });

  return (
    <YStack flex={1} p={12} space>
      <ScrollView style={{ flex: 1 }}>
        <YStack space>
          {chats.map((item) => (
            <Card key={item.id} bordered onPress={() => onOpenChat(item)}>
              <YStack p="$3" space={4}>
                <Text fontWeight="700">{item.name}</Text>
                {item.lastMessage ? (
                  <Text style={{ color: '#6b7280' }}>{item.lastMessage}</Text>
                ) : null}
                {item.lastMessageTime ? (
                  <Text style={{ color: '#9ca3af' }} fontSize={12}>{item.lastMessageTime}</Text>
                ) : null}
              </YStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

const styles = StyleSheet.create({});
