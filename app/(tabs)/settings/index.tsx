import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { useAuth } from '../../../contexts/AuthContext';

export default function SettingsRoute() {
  const { signOut, user } = useAuth();
  return (
    <View style={styles.container}>
      <Text variant="titleMedium">Signed in as {user?.email}</Text>
      <Button mode="outlined" onPress={signOut} style={{ marginTop: 16 }}>
        Sign Out
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, justifyContent: 'center' },
});
