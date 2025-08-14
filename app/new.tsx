import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, TouchableOpacity, View } from "react-native";
import { Button, RadioButton, Text, TextInput } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { db, firestore_instance } from "../firebase/config";

interface User {
  id: string;
  email: string;
  name?: string;
}

export default function NewChatRoute() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [chatName, setChatName] = useState("");
  const [mode, setMode] = useState<"direct" | "group">("direct");

  useEffect(() => {
    const unsub = firestore_instance
      .collection("users")
      // Note: Firestore does not support '!=' for document ID via simple where; we fetch all and filter client-side if needed
      .onSnapshot((snap: FirebaseFirestoreTypes.QuerySnapshot) => {
        const usersData = snap.docs
          .map((d: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
            id: String(d.id),
            ...(d.data() as Partial<User>),
          }))
          .filter((u): u is User => typeof u.email === "string");
        const filtered = usersData.filter((u) => u.id !== String(user?.uid));
        setUsers(filtered);
      });
    return () => unsub();
  }, [user?.uid]);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    try {
      if (mode === "direct") {
        if (selectedUsers.length !== 1) return;
        const otherId = selectedUsers[0];
        const ids = [String(user?.uid), otherId].sort();
        const directKey = ids.join(":");
        const snap = await db
          .collection("chats")
          .where("type", "==", "direct")
          .where("directKey", "==", directKey)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          router.push({
            pathname: "/chat/[chatId]",
            params: {
              chatId: doc.id,
              chatName: (doc.data() as any).name as string,
            },
          });
          return;
        }
        const other = users.find((u) => u.id === otherId);
        const name = other?.email ?? "Direct Chat";
        const chatRef = await firestore_instance.collection("chats").add({
          name,
          participants: [String(user?.uid), otherId],
          type: "direct",
          directKey,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        router.push({
          pathname: "/chat/[chatId]",
          params: { chatId: chatRef.id, chatName: name },
        });
      } else {
        if (!chatName || selectedUsers.length === 0) return;
        const chatRef = await firestore_instance.collection("chats").add({
          name: chatName,
          participants: [...selectedUsers, String(user?.uid)],
          type: "group",
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        router.push({
          pathname: "/chat/[chatId]",
          params: { chatId: chatRef.id, chatName },
        });
      }
    } catch (e) {
      console.error("Error creating chat:", e);
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
      <TextInput
        label="Chat Name"
        value={chatName}
        onChangeText={setChatName}
        style={styles.input}
        disabled={mode === "direct"}
      />
      <TextInput
        label="Search users"
        value={search}
        onChangeText={setSearch}
        style={styles.input}
      />
      <FlatList
        data={filtered}
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
                  ? [item.id]
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
        mode="contained"
        onPress={handleCreate}
        style={styles.createButton}
        disabled={
          mode === "direct"
            ? selectedUsers.length !== 1
            : !chatName || selectedUsers.length === 0
        }
      >
        {mode === "direct" ? "Start Direct Chat" : "Create Group Chat"}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10 },
  modeRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  input: { marginBottom: 10 },
  userCard: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  selectedCard: { backgroundColor: "#f0f8ff" },
  createButton: { marginTop: 10 },
});
