import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'tamagui';
import { useAuth } from '../../../contexts/AuthContext';

export default function SettingsRoute() {
  const { signOut, user } = useAuth();
  return (
    <View style={styles.container}>
      <Text>Signed in as {user?.email}</Text>
      <Button onPress={signOut} style={{ marginTop: 16 }}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
});
