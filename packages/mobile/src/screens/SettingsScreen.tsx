import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Appbar, List, Switch, Divider, Button, SegmentedButtons, Text } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SettingsScreen = ({ navigation }: any) => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [theme, setTheme] = useState<'gmail' | 'outlook'>('gmail');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoClassify, setAutoClassify] = useState(true);
  const [encryptByDefault, setEncryptByDefault] = useState(false);

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('token');
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Configuración" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <List.Section>
          <List.Subheader>Apariencia</List.Subheader>

          <View style={styles.themeSelector}>
            <Text variant="bodyMedium" style={styles.label}>
              Tema
            </Text>
            <SegmentedButtons
              value={theme}
              onValueChange={(value) => setTheme(value as any)}
              buttons={[
                { value: 'gmail', label: 'Gmail' },
                { value: 'outlook', label: 'Outlook' },
              ]}
            />
          </View>

          <List.Item
            title="Modo Oscuro"
            description="Activar tema oscuro"
            left={(props) => <List.Icon {...props} icon="moon-waning-crescent" />}
            right={() => (
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Notificaciones</List.Subheader>
          <List.Item
            title="Notificaciones Push"
            description="Recibir notificaciones de nuevos emails"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notifications}
                onValueChange={setNotifications}
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Inteligencia Artificial</List.Subheader>
          <List.Item
            title="Asistente IA"
            description="Habilitar funciones de IA con Gemini"
            left={(props) => <List.Icon {...props} icon="sparkles" />}
            right={() => (
              <Switch
                value={aiEnabled}
                onValueChange={setAiEnabled}
              />
            )}
          />
          <List.Item
            title="Clasificación Automática"
            description="Clasificar emails automáticamente con IA"
            left={(props) => <List.Icon {...props} icon="tag-multiple" />}
            right={() => (
              <Switch
                value={autoClassify}
                onValueChange={setAutoClassify}
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Seguridad</List.Subheader>
          <List.Item
            title="Encriptación PGP"
            description="Gestionar claves de encriptación"
            left={(props) => <List.Icon {...props} icon="shield-lock" />}
            onPress={() => navigation.navigate('Encryption')}
          />
          <List.Item
            title="Encriptar por Defecto"
            description="Encriptar todos los emails enviados"
            left={(props) => <List.Icon {...props} icon="lock" />}
            right={() => (
              <Switch
                value={encryptByDefault}
                onValueChange={setEncryptByDefault}
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Cuenta</List.Subheader>
          <List.Item
            title="Cuentas de Email"
            description="Gestionar cuentas conectadas"
            left={(props) => <List.Icon {...props} icon="email-multiple" />}
            onPress={() => navigation.navigate('Accounts')}
          />
          <List.Item
            title="Asistente IA"
            description="Funciones avanzadas de IA"
            left={(props) => <List.Icon {...props} icon="robot" />}
            onPress={() => navigation.navigate('AIAssistant')}
          />
        </List.Section>

        <Divider />

        <View style={styles.logoutSection}>
          <Button
            mode="outlined"
            onPress={handleLogout}
            icon="logout"
            textColor="#d32f2f"
            style={styles.logoutButton}
          >
            Cerrar Sesión
          </Button>
        </View>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.version}>
            Gemini Mail v1.0.0
          </Text>
          <Text variant="bodySmall" style={styles.copyright}>
            © 2024 Gemini Mail. Código abierto bajo licencia MIT
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  themeSelector: {
    padding: 16,
  },
  label: {
    marginBottom: 8,
  },
  logoutSection: {
    padding: 16,
    marginTop: 16,
  },
  logoutButton: {
    borderColor: '#d32f2f',
  },
  footer: {
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  version: {
    color: '#666',
    marginBottom: 4,
  },
  copyright: {
    color: '#999',
    textAlign: 'center',
  },
});

export default SettingsScreen;
