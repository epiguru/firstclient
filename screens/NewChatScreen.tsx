import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View, TextInput } from "react-native";
import { Button, Text, XStack } from "tamagui";
import { db } from "../firebase/config";
import { useAuth } from "../contexts/AuthContext";

interface User {
  id: string;
  email: string;
  name?: string;
}

const NewChatScreen = ({ navigation }: any) => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState("");
  const [mode, setMode] = useState<"direct" | "group">("direct");

  useEffect(() => {
    const q = query(collection(db, "users"), where("id", "!=", user?.uid));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData = querySnapshot.docs
        .map((doc) => ({ id: String(doc.id), ...(doc.data() as Partial<User>) }))
        .filter((u): u is User => typeof u.email === "string");
      setUsers(usersData);
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const handleCreateChat = async () => {
    try {
      if (mode === "direct") {
        if (selectedUsers.length !== 1) return;
        const otherId = selectedUsers[0];
        const ids = [String(user?.uid), otherId].sort();
        const directKey = ids.join(":");

        // Check for existing direct chat
        const existingQ = query(
          collection(db, "chats"),
          where("type", "==", "direct"),
          where("directKey", "==", directKey)
        );
        const snap = await getDocs(existingQ);
        if (!snap.empty) {
          const doc = snap.docs[0];
          navigation.navigate("Chat", { chatId: doc.id, chatName: doc.data().name });
          return;
        }

        // Create a new direct chat. Use the other user's email as the name for now.
        const otherUser = users.find((u) => u.id === otherId);
        const name = otherUser?.email ?? "Direct Chat";
        const chatRef = await addDoc(collection(db, "chats"), {
          name,
          participants: [String(user?.uid), otherId],
          type: "direct",
          directKey,
          createdAt: serverTimestamp(),
        });
        navigation.navigate("Chat", { chatId: chatRef.id, chatName: name });
      } else {
        // group chat
        if (!chatName || selectedUsers.length === 0) return;
        const chatRef = await addDoc(collection(db, "chats"), {
          name: chatName,
          participants: [...selectedUsers, String(user?.uid)],
          type: "group",
          createdAt: serverTimestamp(),
        });
        navigation.navigate("Chat", { chatId: chatRef.id, chatName });
      }
    } catch (error) {
      console.error("Error creating chat:", error);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <XStack style={styles.modeRow}>
        <Button onPress={() => setMode("direct")}>Direct</Button>
        <View style={{ width: 20 }} />
        <Button onPress={() => setMode("group")}>Group</Button>
      </XStack>
      <TextInput
        placeholder="Chat Name"
        value={chatName}
        onChangeText={setChatName}
        style={styles.input}
        editable={mode !== "direct"}
      />
      <TextInput
        placeholder="Search users"
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
                mode === "direct"
                  ? [item.id] // only one selection in direct mode
                  : prev.includes(item.id)
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
        onPress={handleCreateChat}
        style={styles.createButton}
        disabled={
          mode === "direct" ? selectedUsers.length !== 1 : !chatName || selectedUsers.length === 0
        }
      >
        {mode === "direct" ? "Start Direct Chat" : "Create Group Chat"}
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
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  userCard: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  selectedCard: {
    backgroundColor: "#e3f2fd",
  },
  createButton: {
    marginTop: 20,
  },
});

export default NewChatScreen;
