import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Button, RadioButton, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { collection, getDocs, onSnapshot, query, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from '../contexts/AuthContext';

interface User { id: string; email: string; name?: string }

export default function NewChatRoute() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState('');
  const [mode, setMode] = useState<'direct' | 'group'>('direct');

  useEffect(() => {
    const qy = query(collection(db, 'users'), where('id', '!=', user?.uid));
    const unsub = onSnapshot(qy, (snap) => {
      const usersData = snap.docs
        .map((d) => ({ id: String(d.id), ...(d.data() as Partial<User>) }))
        .filter((u): u is User => typeof u.email === 'string');
      setUsers(usersData);
    });
    return () => unsub();
  }, [user?.uid]);

  const filtered = users.filter((u) => u.email.toLowerCase().includes(search.toLowerCase()));

  const handleCreate = async () => {
    try {
      if (mode === 'direct') {
        if (selectedUsers.length !== 1) return;
        const otherId = selectedUsers[0];
        const ids = [String(user?.uid), otherId].sort();
        const directKey = ids.join(':');
        const existingQ = query(collection(db, 'chats'), where('type', '==', 'direct'), where('directKey', '==', directKey));
        const snap = await getDocs(existingQ);
        if (!snap.empty) {
          const doc = snap.docs[0];
          router.push({ pathname: '/chat/[chatId]', params: { chatId: doc.id, chatName: doc.data().name as string } });
          return;
        }
        const other = users.find((u) => u.id === otherId);
        const name = other?.email ?? 'Direct Chat';
        const chatRef = await addDoc(collection(db, 'chats'), {
          name,
          participants: [String(user?.uid), otherId],
          type: 'direct',
          directKey,
          createdAt: serverTimestamp(),
        });
        router.push({ pathname: '/chat/[chatId]', params: { chatId: chatRef.id, chatName: name } });
      } else {
        if (!chatName || selectedUsers.length === 0) return;
        const chatRef = await addDoc(collection(db, 'chats'), {
          name: chatName,
          participants: [...selectedUsers, String(user?.uid)],
          type: 'group',
          createdAt: serverTimestamp(),
        });
        router.push({ pathname: '/chat/[chatId]', params: { chatId: chatRef.id, chatName } });
      }
    } catch (e) {
      console.error('Error creating chat:', e);
    }
  };

  return (
    <View style={styles.container}>
      <RadioButton.Group onValueChange={(v) => setMode(v as any)} value={mode}>
        <View style={styles.modeRow}>
          <RadioButton value="direct" />
          <Text>Direct</Text>
          <View style={{ width: 20 }} />
          <RadioButton value="group" />
          <Text>Group</Text>
        </View>
      </RadioButton.Group>
      <TextInput label="Chat Name" value={chatName} onChangeText={setChatName} style={styles.input} disabled={mode === 'direct'} />
      <TextInput label="Search users" value={search} onChangeText={setSearch} style={styles.input} />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.userCard, selectedUsers.includes(item.id) && styles.selectedCard]}
            onPress={() => {
              setSelectedUsers((prev) => (mode === 'direct' ? [item.id] : prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]));
            }}
          >
            <Text>{item.email}</Text>
          </TouchableOpacity>
        )}
      />
      <Button
        mode="contained"
        onPress={handleCreate}
        style={styles.createButton}
        disabled={mode === 'direct' ? selectedUsers.length !== 1 : !chatName || selectedUsers.length === 0}
      >
        {mode === 'direct' ? 'Start Direct Chat' : 'Create Group Chat'}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  modeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  input: { marginBottom: 10 },
  userCard: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  selectedCard: { backgroundColor: '#f0f8ff' },
  createButton: { marginTop: 10 },
});
