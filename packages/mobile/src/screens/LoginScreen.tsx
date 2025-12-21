import React, { useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Text, Card, SegmentedButtons } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../services/api';

const LoginScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      const response = mode === 'login'
        ? await authApi.login(email, password)
        : await authApi.register(email, password, name);

      await AsyncStorage.setItem('token', response.data.token);
      navigation.replace('Home');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>G</Text>
            </View>
            <Text variant="headlineMedium" style={styles.title}>Gemini Mail</Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Personalize your experience
            </Text>
          </View>

          <SegmentedButtons
            value={mode}
            onValueChange={setMode}
            buttons={[
              { value: 'login', label: 'Iniciar Sesión' },
              { value: 'register', label: 'Registrarse' },
            ]}
            style={styles.segmented}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {mode === 'register' && (
            <TextInput
              label="Nombre"
              value={name}
              onChangeText={setName}
              style={styles.input}
              mode="outlined"
            />
          )}

          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            style={styles.input}
            mode="outlined"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            mode="outlined"
            secureTextEntry
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            {mode === 'login' ? 'Iniciar Sesión' : 'Registrarse'}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    color: 'white',
    fontSize: 40,
    fontWeight: 'bold',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: '#666',
  },
  segmented: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  error: {
    color: 'red',
    marginBottom: 15,
    textAlign: 'center',
  },
});

export default LoginScreen;
