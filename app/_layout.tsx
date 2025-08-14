import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import "react-native-gesture-handler";
import { Provider as PaperProvider } from "react-native-paper";
import { AuthProvider, useAuth } from "../contexts/AuthContext";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const inAuth = segments[0] === "auth";
    if (!user && !inAuth) {
      router.replace("/auth");
    } else if (user && inAuth) {
      router.replace("/");
    }
  }, [user, isLoading, segments, router]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <PaperProvider>
      <AuthProvider>
        <AuthGate>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="chat/[chatId]" options={{ title: "Chat" }} />
            <Stack.Screen name="new" options={{ title: "New Chat" }} />
            <Stack.Screen name="auth" options={{ headerShown: false }} />
          </Stack>
        </AuthGate>
      </AuthProvider>
    </PaperProvider>
  );
}
