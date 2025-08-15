import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Button, Text } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';

export default function AuthRoute() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const { signIn, signUp, isLoading } = useAuth();

  const handleSignIn = async () => {
    if (email && password) {
      await signIn(email, password);
    }
  };

  const handleSignUp = async () => {
    if (email && password) {
      await signUp(email, password, name);
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', marginBottom: 16 }}>
        <Button
          onPress={() => setMode('signin')}
          disabled={isLoading}
          style={[styles.tab, mode === 'signin' ? styles.tabActive : undefined]}
        >
          <Text>Sign In</Text>
        </Button>
        <Button
          onPress={() => setMode('signup')}
          disabled={isLoading}
          style={[styles.tab, mode === 'signup' ? styles.tabActive : undefined]}
        >
          <Text>Sign Up</Text>
        </Button>
      </View>
      {mode === 'signup' ? (
        <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
      ) : null}
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      {mode === 'signin' ? (
        <Button onPress={handleSignIn} disabled={isLoading} style={styles.button}>
          <Text>Sign In</Text>
        </Button>
      ) : (
        <Button onPress={handleSignUp} disabled={isLoading} style={styles.button}>
          <Text>Sign Up</Text>
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 15,
  },
  tab: {
    flex: 1,
    marginRight: 8,
  },
  tabActive: {
    opacity: 1,
  },
  button: {
    marginBottom: 10,
  },
});
