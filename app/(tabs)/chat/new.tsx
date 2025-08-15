import firestore, {
  FirebaseFirestoreTypes,
} from "@react-native-firebase/firestore";
import { useRouter } from "expo-router";
import { Formik } from "formik";
import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { Button, Card, Input, ScrollView, Text, XStack, YStack } from "tamagui";
import { z } from "zod";
import { toFormikValidationSchema } from "zod-formik-adapter";
import { useAuth } from "../../../contexts/AuthContext";
import { firestore_instance } from "../../../firebase/config";
import type { User } from "@shared/schemas/user";

// Use shared User type from @shared/schemas/user

export default function NewChatRoute() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<User[]>([]);
  const [existingDirectPartnerIds, setExistingDirectPartnerIds] = useState<Set<string>>(new Set());
  // Formik will manage: mode, chatName, selectedUsers

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

  // Subscribe to direct chats the current user already has, to exclude those users from the list
  useEffect(() => {
    const uid = String(user?.uid || "");
    if (!uid) return;
    const q = firestore_instance
      .collection("chats")
      .where("type", "==", "direct")
      .where("participants", "array-contains", uid);
    const unsub = q.onSnapshot((snap) => {
      const partnerIds = new Set<string>();
      snap.docs.forEach((d) => {
        const data = d.data() as any;
        const parts: string[] = Array.isArray(data?.participants) ? data.participants.map(String) : [];
        const other = parts.find((p) => p !== uid);
        if (other) partnerIds.add(other);
      });
      setExistingDirectPartnerIds(partnerIds);
    });
    return () => unsub();
  }, [user?.uid]);

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase()) && !existingDirectPartnerIds.has(u.id)
  );

  // Zod schema: discriminated union on mode
  const formSchema = z.discriminatedUnion("mode", [
    z.object({
      mode: z.literal("direct"),
      chatName: z.string().optional().or(z.literal("")),
      selectedUsers: z.array(z.string()).length(1, "Select exactly one user"),
    }),
    z.object({
      mode: z.literal("group"),
      chatName: z.string().min(1, "Group name is required"),
      selectedUsers: z.array(z.string()).min(1, "Select at least one user"),
    }),
  ]);

  return (
    <YStack flex={1} p={12} space>
      <Formik
        initialValues={{
          mode: "direct" as "direct" | "group",
          chatName: "",
          selectedUsers: [] as string[],
        }}
        validationSchema={toFormikValidationSchema(formSchema)}
        onSubmit={async (values, { setSubmitting }) => {
          try {
            if (values.mode === "direct") {
              const otherId = values.selectedUsers[0];
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
                  pathname: "/(tabs)/chat/[chatId]",
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
                pathname: "/(tabs)/chat/[chatId]",
                params: { chatId: chatRef.id, chatName: name },
              });
            } else {
              const chatRef = await firestore_instance.collection("chats").add({
                name: values.chatName,
                participants: [...values.selectedUsers, String(user?.uid)],
                type: "group",
                createdAt: firestore.FieldValue.serverTimestamp(),
              });
              router.push({
                pathname: "/(tabs)/chat/[chatId]",
                params: { chatId: chatRef.id, chatName: values.chatName },
              });
            }
          } catch (e) {
            console.error("Error creating chat:", e);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({
          values,
          errors,
          touched,
          setFieldValue,
          handleChange,
          handleSubmit,
          isSubmitting,
        }) => {
          const isDirect = values.mode === "direct";
          return (
            <>
              <XStack style={{ alignItems: 'center', justifyContent: 'flex-start' }} space>
                <Button
                  size="$3"
                  theme={isDirect ? "active" : (null as any)}
                  onPress={() => setFieldValue("mode", "direct")}
                >
                  Direct
                </Button>
                <Button
                  size="$3"
                  theme={!isDirect ? "active" : (null as any)}
                  onPress={() => setFieldValue("mode", "group")}
                >
                  Group
                </Button>
              </XStack>

              {isDirect ? null : (
                <Input
                  placeholder="Chat Name"
                  value={values.chatName}
                  onChangeText={handleChange("chatName")}
                  disabled={isDirect}
                />
              )}
              {touched.chatName && typeof errors.chatName === "string" ? (
                <Text style={{ color: "#ef4444" }}>{errors.chatName}</Text>
              ) : null}

              <Input
                placeholder="Search users"
                value={search}
                onChangeText={setSearch}
              />

              <ScrollView style={{ flex: 1 }}>
                <YStack space>
                  {filtered.map((item) => {
                    const selected = values.selectedUsers.includes(item.id);
                    return (
                      <Card
                        key={item.id}
                        elevate={selected}
                        bordered
                        onPress={() => {
                          if (isDirect) {
                            setFieldValue("selectedUsers", [item.id]);
                          } else {
                            const prev = values.selectedUsers;
                            setFieldValue(
                              "selectedUsers",
                              prev.includes(item.id)
                                ? prev.filter((id) => id !== item.id)
                                : [...prev, item.id]
                            );
                          }
                        }}
                      >
                        <XStack p="$3" style={{ alignItems: 'center', justifyContent: 'space-between' }}>
                          <Text>{item.email}</Text>
                          {selected ? <Text>✓</Text> : null}
                        </XStack>
                      </Card>
                    );
                  })}
                </YStack>
              </ScrollView>

              {typeof errors.selectedUsers === "string" ? (
                <Text style={{ color: "#ef4444" }}>{errors.selectedUsers}</Text>
              ) : null}

              <Button
                onPress={() => handleSubmit()}
                disabled={
                  isSubmitting ||
                  (isDirect
                    ? values.selectedUsers.length !== 1
                    : values.chatName.length === 0 ||
                      values.selectedUsers.length === 0)
                }
              >
                {isDirect ? "Start Direct Chat" : "Create Group Chat"}
              </Button>
            </>
          );
        }}
      </Formik>
    </YStack>
  );
}

const styles = StyleSheet.create({});
