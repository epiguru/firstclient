import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import AuthScreen from './src/screens/AuthScreen';
import ChatListScreen from './src/screens/ChatListScreen';
import ChatScreen from './src/screens/ChatScreen';
import NewChatScreen from './src/screens/NewChatScreen';

const Stack = createNativeStackNavigator();

function RootNavigator() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  return (
    <Stack.Navigator>
      {user ? (
        <>
          <Stack.Screen name="ChatList" component={ChatListScreen} options={{ title: 'Chats' }} />
          <Stack.Screen name="Chat" component={ChatScreen} options={({ route }: any) => ({ title: route.params?.chatName || 'Chat' })} />
          <Stack.Screen name="NewChat" component={NewChatScreen} options={{ title: 'New Chat' }} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <PaperProvider>
      <AuthProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </PaperProvider>
  );
}

// Styles not needed in root app component
