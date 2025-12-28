import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Appbar, Card, Text, Button, TextInput, List, IconButton } from 'react-native-paper';
import api from '../services/api';

interface PGPKey {
  keyId: string;
  name: string;
  email: string;
  fingerprint: string;
  createdAt: string;
  isPrivate: boolean;
}

const EncryptionScreen = ({ navigation }: any) => {
  const [keys, setKeys] = useState<PGPKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [passphrase, setPassphrase] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    setLoading(true);
    try {
      const response = await api.get('/encryption/keys');
      setKeys(response.data);
    } catch (error) {
      console.error('Error loading keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!name || !email || !passphrase) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await api.post('/encryption/keys/generate', {
        name,
        email,
        passphrase,
      });

      Alert.alert('Éxito', 'Par de claves generado correctamente');
      setShowGenerate(false);
      setName('');
      setEmail('');
      setPassphrase('');
      loadKeys();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al generar claves');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPublicKey = async (keyId: string) => {
    try {
      const response = await api.get(`/encryption/keys/${keyId}/export/public`);
      Alert.alert('Clave Pública', response.data.publicKey);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al exportar');
    }
  };

  const handleDeleteKey = (keyId: string) => {
    Alert.alert(
      'Eliminar Clave',
      '¿Estás seguro? Esta acción no se puede deshacer',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/encryption/keys/${keyId}`);
              loadKeys();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error || 'Error al eliminar');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Encriptación PGP" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.cardTitle}>
              Encriptación End-to-End
            </Text>
            <Text variant="bodyMedium" style={styles.infoText}>
              Protege tus emails con encriptación PGP/GPG. Genera un par de claves
              (pública y privada) para enviar y recibir mensajes encriptados.
            </Text>
          </Card.Content>
        </Card>

        {keys.length === 0 && !showGenerate && (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <Text variant="titleMedium" style={styles.emptyTitle}>
                No tienes claves configuradas
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Genera tu primer par de claves para comenzar a encriptar tus emails
              </Text>
              <Button
                mode="contained"
                onPress={() => setShowGenerate(true)}
                icon="shield-key"
                style={styles.generateButton}
              >
                Generar Claves
              </Button>
            </Card.Content>
          </Card>
        )}

        {showGenerate && (
          <Card style={styles.generateCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Generar Par de Claves PGP
              </Text>

              <TextInput
                label="Nombre"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
              />

              <TextInput
                label="Frase de Contraseña"
                value={passphrase}
                onChangeText={setPassphrase}
                mode="outlined"
                secureTextEntry
                style={styles.input}
                placeholder="Mínimo 8 caracteres"
              />

              <Text variant="bodySmall" style={styles.warningText}>
                ⚠️ Guarda esta frase de contraseña de forma segura. La necesitarás
                para desencriptar tus mensajes y no se puede recuperar.
              </Text>
            </Card.Content>

            <Card.Actions>
              <Button onPress={() => setShowGenerate(false)}>Cancelar</Button>
              <Button onPress={handleGenerateKey} loading={loading}>
                Generar
              </Button>
            </Card.Actions>
          </Card>
        )}

        {keys.length > 0 && (
          <>
            <View style={styles.header}>
              <Text variant="titleMedium">Mis Claves</Text>
              {!showGenerate && (
                <Button
                  mode="outlined"
                  onPress={() => setShowGenerate(true)}
                  icon="plus"
                  compact
                >
                  Nueva
                </Button>
              )}
            </View>

            {keys.map((key) => (
              <Card key={key.keyId} style={styles.keyCard}>
                <Card.Content>
                  <List.Item
                    title={key.name}
                    description={`${key.email}\n${key.isPrivate ? 'Clave privada' : 'Clave pública'}`}
                    left={(props) => (
                      <List.Icon
                        {...props}
                        icon={key.isPrivate ? 'shield-lock' : 'shield-lock-outline'}
                      />
                    )}
                    right={(props) => (
                      <View style={styles.keyActions}>
                        <IconButton
                          icon="export"
                          onPress={() => handleExportPublicKey(key.keyId)}
                        />
                        <IconButton
                          icon="delete"
                          onPress={() => handleDeleteKey(key.keyId)}
                        />
                      </View>
                    )}
                  />

                  <Text variant="bodySmall" style={styles.fingerprint}>
                    Huella: {key.fingerprint}
                  </Text>
                  <Text variant="bodySmall" style={styles.date}>
                    Creada: {new Date(key.createdAt).toLocaleDateString()}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        <Card style={styles.helpCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.helpTitle}>
              ¿Cómo funciona?
            </Text>
            <Text variant="bodySmall" style={styles.helpText}>
              1. Genera un par de claves (pública y privada){'\n'}
              2. Comparte tu clave pública con tus contactos{'\n'}
              3. Tus contactos encriptarán mensajes con tu clave pública{'\n'}
              4. Solo tú podrás desencriptarlos con tu clave privada{'\n'}
              5. La encriptación es automática cuando esté configurada
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    marginBottom: 16,
    backgroundColor: '#e3f2fd',
  },
  cardTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  infoText: {
    color: '#666',
    lineHeight: 20,
  },
  emptyCard: {
    marginBottom: 16,
  },
  emptyContent: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  generateCard: {
    marginBottom: 16,
  },
  generateButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 12,
  },
  warningText: {
    color: '#ef6c00',
    marginTop: 8,
    lineHeight: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  keyCard: {
    marginBottom: 12,
  },
  keyActions: {
    flexDirection: 'row',
  },
  fingerprint: {
    color: '#666',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  date: {
    color: '#999',
    marginTop: 4,
  },
  helpCard: {
    marginTop: 16,
    marginBottom: 32,
    backgroundColor: '#fff3e0',
  },
  helpTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  helpText: {
    color: '#666',
    lineHeight: 20,
  },
});

export default EncryptionScreen;
