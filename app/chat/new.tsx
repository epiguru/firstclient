import firestore, { FirebaseFirestoreTypes } from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { useAuth } from "../../contexts/AuthContext";
import { firestore_instance } from "../../firebase/config";
import { YStack, XStack, Input, Button, Text, ScrollView, Separator, Card } from "tamagui";

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
        const snap = await firestore_instance
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
    <YStack f={1} p={12} space>
      <XStack ai="center" jc="flex-start" space>
        <Button
          size="$3"
          theme={mode === "direct" ? "active" : null as any}
          onPress={() => setMode("direct")}
        >
          Direct
        </Button>
        <Button
          size="$3"
          theme={mode === "group" ? "active" : null as any}
          onPress={() => setMode("group")}
        >
          Group
        </Button>
      </XStack>

      <Input
        placeholder="Chat Name"
        value={chatName}
        onChangeText={setChatName}
        disabled={mode === "direct"}
      />

      <Input
        placeholder="Search users"
        value={search}
        onChangeText={setSearch}
      />

      <ScrollView style={{ flex: 1 }}>
        <YStack space>
          {filtered.map((item) => {
            const selected = selectedUsers.includes(item.id);
            return (
              <Card
                key={item.id}
                elevate={selected}
                bordered
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
                <XStack p="$3" ai="center" jc="space-between">
                  <Text>{item.email}</Text>
                  {selected ? <Text>✓</Text> : null}
                </XStack>
              </Card>
            );
          })}
        </YStack>
      </ScrollView>

      <Button
        onPress={handleCreate}
        disabled={
          mode === "direct"
            ? selectedUsers.length !== 1
            : !chatName || selectedUsers.length === 0
        }
      >
        {mode === "direct" ? "Start Direct Chat" : "Create Group Chat"}
      </Button>
    </YStack>
  );
}

const styles = StyleSheet.create({});
