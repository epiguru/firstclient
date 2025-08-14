import { collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { Button, Card, Text } from "react-native-paper";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

interface Chat {
  id: string;
  name: string;
  lastMessage?: string;
  lastMessageTime?: string;
}

const ChatListScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user?.uid)
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

  const handleNewChat = () => {
    navigation.navigate("NewChat");
  };

  const handleChatPress = (chat: Chat) => {
    navigation.navigate("Chat", { chatId: chat.id, chatName: chat.name });
  };

  return (
    <View style={styles.container}>
      <Button
        mode="contained"
        onPress={handleNewChat}
        style={styles.newChatButton}
      >
        New Chat
      </Button>
      <FlatList
        data={chats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.chatCard} onPress={() => handleChatPress(item)}>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  newChatButton: {
    marginBottom: 10,
  },
  chatCard: {
    marginBottom: 10,
  },
  lastMessage: {
    color: "#666",
  },
  time: {
    color: "#999",
  },
});

export default ChatListScreen;
