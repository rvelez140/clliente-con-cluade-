import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet, Alert } from 'react-native';
import { Appbar, FAB, List, Avatar, IconButton, Portal, Dialog, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import { emailApi } from '../services/api';
import { EmailAccount } from '../types';

const AccountsScreen = ({ navigation }: any) => {
  const [accounts, setAccounts] = useState<EmailAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [provider, setProvider] = useState<'gmail' | 'outlook' | 'custom'>('gmail');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [imapHost, setImapHost] = useState('');
  const [imapPort, setImapPort] = useState('993');
  const [smtpHost, setSmtpHost] = useState('');
  const [smtpPort, setSmtpPort] = useState('587');

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await emailApi.getAccounts();
      setAccounts(response.data);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAccount = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (provider === 'custom' && (!imapHost || !smtpHost)) {
      Alert.alert('Error', 'Por favor completa la configuración del servidor');
      return;
    }

    setLoading(true);
    try {
      await emailApi.addAccount({
        provider,
        email,
        password,
        ...(provider === 'custom' && {
          imapHost,
          imapPort: parseInt(imapPort),
          smtpHost,
          smtpPort: parseInt(smtpPort),
        }),
      });

      setShowAddDialog(false);
      setEmail('');
      setPassword('');
      setImapHost('');
      setSmtpHost('');
      loadAccounts();
      Alert.alert('Éxito', 'Cuenta agregada correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al agregar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'gmail':
        return 'google';
      case 'outlook':
        return 'microsoft-outlook';
      default:
        return 'email';
    }
  };

  const renderAccount = ({ item }: { item: EmailAccount }) => (
    <List.Item
      title={item.email}
      description={item.provider.toUpperCase()}
      left={(props) => (
        <Avatar.Icon {...props} icon={getProviderIcon(item.provider)} size={48} />
      )}
      right={(props) => (
        <IconButton icon="cog" onPress={() => {}} />
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Cuentas de Email" />
      </Appbar.Header>

      <FlatList
        data={accounts}
        renderItem={renderAccount}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadAccounts}
      />

      <FAB
        icon="plus"
        label="Agregar Cuenta"
        style={styles.fab}
        onPress={() => setShowAddDialog(true)}
      />

      <Portal>
        <Dialog visible={showAddDialog} onDismiss={() => setShowAddDialog(false)}>
          <Dialog.Title>Agregar Cuenta</Dialog.Title>
          <Dialog.Content>
            <SegmentedButtons
              value={provider}
              onValueChange={(value) => setProvider(value as any)}
              buttons={[
                { value: 'gmail', label: 'Gmail' },
                { value: 'outlook', label: 'Outlook' },
                { value: 'custom', label: 'Otro' },
              ]}
              style={styles.providerButtons}
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
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry
              style={styles.input}
            />

            {provider === 'custom' && (
              <>
                <TextInput
                  label="Servidor IMAP"
                  value={imapHost}
                  onChangeText={setImapHost}
                  mode="outlined"
                  placeholder="imap.ejemplo.com"
                  style={styles.input}
                />
                <TextInput
                  label="Puerto IMAP"
                  value={imapPort}
                  onChangeText={setImapPort}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  label="Servidor SMTP"
                  value={smtpHost}
                  onChangeText={setSmtpHost}
                  mode="outlined"
                  placeholder="smtp.ejemplo.com"
                  style={styles.input}
                />
                <TextInput
                  label="Puerto SMTP"
                  value={smtpPort}
                  onChangeText={setSmtpPort}
                  mode="outlined"
                  keyboardType="numeric"
                  style={styles.input}
                />
              </>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onPress={handleAddAccount} loading={loading}>
              Agregar
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  providerButtons: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
});

export default AccountsScreen;
