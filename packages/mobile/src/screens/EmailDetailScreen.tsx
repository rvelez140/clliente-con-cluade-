import React, { useState } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Appbar, Text, Card, Avatar, IconButton, FAB, Portal, Dialog, Button } from 'react-native-paper';
import { Email } from '../types';

const EmailDetailScreen = ({ route, navigation }: any) => {
  const { email } = route.params as { email: Email };
  const [showActions, setShowActions] = useState(false);

  const renderHeader = () => (
    <Card.Title
      title={email.from}
      subtitle={new Date(email.receivedAt).toLocaleString()}
      left={(props) => (
        <Avatar.Text
          {...props}
          label={email.from[0]?.toUpperCase() || 'U'}
          size={48}
        />
      )}
      right={(props) => (
        <View style={styles.headerActions}>
          <IconButton icon="star-outline" onPress={() => {}} />
          <IconButton icon="archive-outline" onPress={() => {}} />
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Email" />
        <Appbar.Action icon="delete" onPress={() => {}} />
        <Appbar.Action icon="dots-vertical" onPress={() => setShowActions(true)} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          {renderHeader()}

          <Card.Content>
            <Text variant="headlineSmall" style={styles.subject}>
              {email.subject}
            </Text>

            <Text variant="bodyMedium" style={styles.recipients}>
              Para: {email.to.join(', ')}
            </Text>

            <View style={styles.divider} />

            <Text variant="bodyMedium" style={styles.body}>
              {email.body}
            </Text>
          </Card.Content>
        </Card>
      </ScrollView>

      <FAB
        icon="reply"
        label="Responder"
        style={styles.fab}
        onPress={() => navigation.navigate('Compose', {
          replyTo: email,
          mode: 'reply'
        })}
      />

      <Portal>
        <Dialog visible={showActions} onDismiss={() => setShowActions(false)}>
          <Dialog.Title>Acciones</Dialog.Title>
          <Dialog.Content>
            <Button icon="reply" onPress={() => navigation.navigate('Compose', { replyTo: email, mode: 'reply' })}>
              Responder
            </Button>
            <Button icon="reply-all" onPress={() => navigation.navigate('Compose', { replyTo: email, mode: 'reply-all' })}>
              Responder a todos
            </Button>
            <Button icon="share" onPress={() => navigation.navigate('Compose', { replyTo: email, mode: 'forward' })}>
              Reenviar
            </Button>
            <Button icon="shield-lock" onPress={() => {}}>
              Encriptar
            </Button>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowActions(false)}>Cerrar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  },
  card: {
    margin: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subject: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipients: {
    color: '#666',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 16,
  },
  body: {
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default EmailDetailScreen;
