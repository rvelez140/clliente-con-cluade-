import React, { useState, useEffect } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Appbar, FAB, List, Avatar, Chip } from 'react-native-paper';
import { emailApi } from '../services/api';
import { Email } from '../types';

const HomeScreen = ({ navigation }: any) => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    try {
      const accountsResponse = await emailApi.getAccounts();
      if (accountsResponse.data.length > 0) {
        const emailsResponse = await emailApi.getEmails(accountsResponse.data[0].id);
        setEmails(emailsResponse.data);
      }
    } catch (error) {
      console.error('Error loading emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderEmail = ({ item }: { item: Email }) => (
    <List.Item
      title={item.from}
      description={item.subject}
      left={(props) => (
        <Avatar.Text
          {...props}
          label={item.from[0]?.toUpperCase() || 'U'}
          size={40}
        />
      )}
      right={(props) => (
        <View style={styles.rightContent}>
          <Chip {...props} size={16}>
            {new Date(item.receivedAt).toLocaleDateString()}
          </Chip>
        </View>
      )}
      onPress={() => navigation.navigate('EmailDetail', { email: item })}
      style={!item.isRead ? styles.unread : undefined}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Gemini Mail" />
        <Appbar.Action icon="magnify" onPress={() => {}} />
        <Appbar.Action icon="cog" onPress={() => navigation.navigate('Settings')} />
      </Appbar.Header>

      <FlatList
        data={emails}
        renderItem={renderEmail}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadEmails}
      />

      <FAB
        icon="pencil"
        style={styles.fab}
        onPress={() => navigation.navigate('Compose')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  unread: {
    backgroundColor: '#f0f0f0',
  },
  rightContent: {
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default HomeScreen;
