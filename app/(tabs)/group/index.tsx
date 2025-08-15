import firestore from "@react-native-firebase/firestore";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import {
  Card,
  H2,
  Paragraph,
  ScrollView,
  Separator,
  Text,
  YStack,
} from "tamagui";
import { useAuth } from "../../../contexts/AuthContext";

interface GroupSummary {
  id: string;
  name: string;
  participants: string[];
}

export default function GroupTab() {
  const { user } = useAuth();
  const [groups, setGroups] = useState<GroupSummary[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = firestore()
      .collection("chats")
      .where("type", "==", "group")
      .where("participants", "array-contains", String(user.uid))
      .onSnapshot((snap) => {
        const items = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as any[];
        setGroups(
          items.map((g) => ({
            id: g.id,
            name: g.name ?? "Group",
            participants: g.participants ?? [],
          }))
        );
      });
    return () => unsub();
  }, [user?.uid]);

  return (
    <ScrollView style={styles.container}>
      <YStack p={16} space>
        <H2>Group Memory & Alignment</H2>
        <Paragraph style={{ color: "#6b7280" }}>
          View and manage shared context for your groups. This is a starter
          screen – we can wire it to your preferred "memory/alignment" data
          model next.
        </Paragraph>
        <Separator />

        {groups.length === 0 ? (
          <Text mt={8}>You have no group chats yet.</Text>
        ) : (
          groups.map((g) => (
            <Card key={g.id} bordered elevate size="$4" p="$4" my="$2">
              <YStack space>
                <Text fontWeight="700">{g.name}</Text>
                <Text style={{ color: "#6b7280" }}>Members: {g.participants.length}</Text>
                <Separator />
                <Text>Alignment: Coming soon</Text>
                <Text>Memory: Coming soon</Text>
              </YStack>
            </Card>
          ))
        )}
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
