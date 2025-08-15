import { Stack } from 'expo-router';

export default function ChatStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Chats' }} />
      <Stack.Screen name="[chatId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
