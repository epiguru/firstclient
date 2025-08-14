import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Card, TextInput, Button } from 'react-native-paper';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';

interface User {
  id: string;
  email: string;
  name?: string;
}

const NewChatScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');

  useEffect(() => {
    const q = query(
      collection(db, 'users'),
      where('id', '!=', user?.uid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreateChat = async () => {
    if (!chatName || selectedUsers.length === 0) return;

    try {
      const chatRef = await addDoc(collection(db, 'chats'), {
        name: chatName,
        participants: [...selectedUsers, user?.uid],
        type: selectedUsers.length === 1 ? 'direct' : 'group',
        createdAt: new Date(),
      });

      navigation.navigate('Chat', {
        chatId: chatRef.id,
        chatName,
      });
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <TextInput
        label="Chat Name"
        value={chatName}
        onChangeText={setChatName}
        style={styles.input}
      />
      <TextInput
        label="Search users"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.userCard,
              selectedUsers.includes(item.id) && styles.selectedCard,
            ]}
            onPress={() => {
              setSelectedUsers((prev) =>
                prev.includes(item.id)
                  ? prev.filter((id) => id !== item.id)
                  : [...prev, item.id]
              );
            }}
          >
            <Text>{item.email}</Text>
          </TouchableOpacity>
        )}
      />
      <Button
        mode="contained"
        onPress={handleCreateChat}
        style={styles.createButton}
        disabled={!chatName || selectedUsers.length === 0}
      >
        Create Chat
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  input: {
    marginBottom: 10,
  },
  userCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  selectedCard: {
    backgroundColor: '#e3f2fd',
  },
  createButton: {
    marginTop: 20,
  },
});

export default NewChatScreen;
