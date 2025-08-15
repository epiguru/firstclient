import firestore from "@react-native-firebase/firestore";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Card, H2, Paragraph, ScrollView, Separator, Text, YStack, XStack } from "tamagui";
import { useAuth } from "../../../contexts/AuthContext";

interface GroupMemoryDoc {
  goals?: string[];
  purpose?: string;
  risks?: string[];
}

export default function GroupTab() {
  const { user } = useAuth();
  const [memory, setMemory] = useState<GroupMemoryDoc | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    // chats/general/__meta/groupMemory
    const unsub = firestore()
      .collection("chats")
      .doc("general")
      .collection("__meta")
      .doc("groupMemory")
      .onSnapshot((doc) => {
        if (!doc.exists) {
          setMemory(null);
          return;
        }
        const d = doc.data() as any;
        setMemory({
          goals: Array.isArray(d?.goals) ? d.goals.map(String) : [],
          purpose: d?.purpose ? String(d.purpose) : undefined,
          risks: Array.isArray(d?.risks) ? d.risks.map(String) : [],
        });
      });
    return () => unsub();
  }, [user?.uid]);

  return (
    <ScrollView style={styles.container}>
      <YStack p={16} space>
        <H2>Group Memory & Alignment</H2>
        <Paragraph style={{ color: "#6b7280" }}>
          Shared context for the General group.
        </Paragraph>
        <Separator />

        <Card bordered elevate size="$4" p="$4" my="$2">
          <YStack space>
            <Text fontWeight="700">Purpose</Text>
            <Text>{memory?.purpose || "—"}</Text>
            <Separator />

            <Text fontWeight="700">Goals</Text>
            {memory?.goals && memory.goals.length > 0 ? (
              <YStack>
                {memory.goals.map((g, idx) => (
                  <XStack key={idx} space>
                    <Text>•</Text>
                    <Text>{g}</Text>
                  </XStack>
                ))}
              </YStack>
            ) : (
              <Text>—</Text>
            )}
            <Separator />

            <Text fontWeight="700">Risks</Text>
            {memory?.risks && memory.risks.length > 0 ? (
              <YStack>
                {memory.risks.map((r, idx) => (
                  <XStack key={idx} space>
                    <Text>•</Text>
                    <Text>{r}</Text>
                  </XStack>
                ))}
              </YStack>
            ) : (
              <Text>—</Text>
            )}
          </YStack>
        </Card>
      </YStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
});
