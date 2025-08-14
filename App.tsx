import 'react-native-gesture-handler';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthScreen from './screens/AuthScreen';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import NewChatScreen from './screens/NewChatScreen';

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
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

// Styles not needed in root app component
