import React, { useState } from 'react';
import { View, StyleSheet, TextInput } from 'react-native';
import { Button, Text } from 'tamagui';
import { useAuth } from '../contexts/AuthContext';

const AuthScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, signUp, isLoading } = useAuth();

  const handleSignIn = async () => {
    if (email && password) {
      await signIn(email, password);
    }
  };

  const handleSignUp = async () => {
    if (email && password) {
      await signUp(email, password);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={styles.input} />
      <TextInput placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
      <Button
        onPress={handleSignIn}
        disabled={isLoading}
        style={styles.button}
      >
        Sign In
      </Button>
      <Button
        onPress={handleSignUp}
        disabled={isLoading}
        style={styles.button}
      >
        Sign Up
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginBottom: 10,
  },
});

export default AuthScreen;
