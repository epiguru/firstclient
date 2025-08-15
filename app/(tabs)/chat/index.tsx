import firestore from '@react-native-firebase/firestore';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { YStack, Card, Text, XStack, ScrollView } from 'tamagui';
import { useQueryMap, mapChat, WithId } from '../../shared/firestore';

type Chat = WithId<ReturnType<typeof mapChat>>;

export default function ChatListRoute() {
  const { user } = useAuth();
  const router = useRouter();

  const chatsQuery = user?.uid
    ? firestore()
        .collection('chats')
        .where('participants', 'array-contains', String(user.uid))
        .orderBy('lastMessageTime', 'desc')
    : undefined;
  const { docs: chats } = useQueryMap(chatsQuery as any, mapChat, [user?.uid]);

  const onOpenChat = (chat: Chat) => router.push({ pathname: '/(tabs)/chat/[chatId]', params: { chatId: chat.id, chatName: chat.name } });

  const formatTime = (d?: Date) => {
    if (!d) return '';
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    return `${days}d`;
  };

  return (
    <YStack flex={1} p={12} space>
      <ScrollView style={{ flex: 1 }}>
        <YStack space>
          {chats.map((item) => (
            <Card key={item.id} bordered onPress={() => onOpenChat({ id: item.id, name: item.name } as any)}>
              <XStack p="$3" space={12} style={{ alignItems: 'center' }}>
                <AvatarCircle name={item.name} />
                <YStack space={2} style={{ flex: 1 }}>
                  <XStack style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text fontWeight="700" numberOfLines={1}>{item.name}</Text>
                    <Text style={{ color: '#9ca3af' }} fontSize={12}>{formatTime(item.lastMessageTime)}</Text>
                  </XStack>
                  {item.lastMessage ? (
                    <Text style={{ color: '#6b7280' }} numberOfLines={1}>
                      {item as any && (item as any).lastMessageUserName ? `${(item as any).lastMessageUserName}: ` : ''}
                      {item.lastMessage}
                    </Text>
                  ) : (
                    <Text style={{ color: '#9ca3af' }} fontSize={12}>No messages yet</Text>
                  )}
                </YStack>
              </XStack>
            </Card>
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

const AvatarCircle: React.FC<{ name: string }> = ({ name }) => {
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return (
    <YStack style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#e5e7eb' }}>
      <Text fontWeight="700">{initial}</Text>
    </YStack>
  );
};

const styles = StyleSheet.create({});
