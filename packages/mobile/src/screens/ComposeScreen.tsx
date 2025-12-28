import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Appbar, TextInput, Button, Chip, Portal, Dialog, SegmentedButtons } from 'react-native-paper';
import { emailApi, geminiApi } from '../services/api';
import { Email } from '../types';

const ComposeScreen = ({ route, navigation }: any) => {
  const { replyTo, mode } = route.params || {};
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('professional');

  useEffect(() => {
    if (replyTo) {
      if (mode === 'reply') {
        setTo(replyTo.from);
        setSubject(`Re: ${replyTo.subject}`);
      } else if (mode === 'reply-all') {
        setTo([replyTo.from, ...replyTo.to].join(', '));
        setSubject(`Re: ${replyTo.subject}`);
      } else if (mode === 'forward') {
        setSubject(`Fwd: ${replyTo.subject}`);
        setBody(`\n\n-------- Mensaje reenviado --------\n${replyTo.body}`);
      }
    }
  }, [replyTo, mode]);

  const handleSend = async () => {
    if (!to || !subject || !body) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      const accounts = await emailApi.getAccounts();
      if (accounts.data.length > 0) {
        await emailApi.sendEmail(accounts.data[0].id, {
          to: to.split(',').map(e => e.trim()),
          subject,
          body,
        });
        Alert.alert('Éxito', 'Email enviado correctamente');
        navigation.goBack();
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    setLoading(true);
    try {
      const response = await geminiApi.generateEmail({
        prompt: aiPrompt,
        tone: aiTone,
      });

      setSubject(response.data.subject || subject);
      setBody(response.data.body || '');
      setShowAI(false);
      setAiPrompt('');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al generar con IA');
    } finally {
      setLoading(false);
    }
  };

  const handleAIImprove = async () => {
    if (!body) {
      Alert.alert('Error', 'Escribe algo primero');
      return;
    }

    setLoading(true);
    try {
      const response = await geminiApi.improveDraft(body, aiTone);
      setBody(response.data.improvedDraft || body);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al mejorar con IA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Nuevo Email" />
        <Appbar.Action icon="send" onPress={handleSend} disabled={loading} />
        <Appbar.Action icon="sparkles" onPress={() => setShowAI(true)} />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <TextInput
          label="Para"
          value={to}
          onChangeText={setTo}
          style={styles.input}
          mode="outlined"
          placeholder="destinatario@ejemplo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <TextInput
          label="Asunto"
          value={subject}
          onChangeText={setSubject}
          style={styles.input}
          mode="outlined"
        />

        <View style={styles.aiActions}>
          <Chip icon="auto-fix" onPress={handleAIImprove} disabled={loading}>
            Mejorar con IA
          </Chip>
        </View>

        <TextInput
          label="Mensaje"
          value={body}
          onChangeText={setBody}
          style={[styles.input, styles.bodyInput]}
          mode="outlined"
          multiline
          numberOfLines={15}
          textAlignVertical="top"
        />

        <Button
          mode="contained"
          onPress={handleSend}
          loading={loading}
          disabled={loading}
          style={styles.sendButton}
          icon="send"
        >
          Enviar Email
        </Button>
      </ScrollView>

      <Portal>
        <Dialog visible={showAI} onDismiss={() => setShowAI(false)}>
          <Dialog.Title>Generar con IA</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Describe el email que quieres escribir"
              value={aiPrompt}
              onChangeText={setAiPrompt}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.aiInput}
            />

            <SegmentedButtons
              value={aiTone}
              onValueChange={setAiTone}
              buttons={[
                { value: 'professional', label: 'Profesional' },
                { value: 'casual', label: 'Casual' },
                { value: 'formal', label: 'Formal' },
              ]}
              style={styles.toneButtons}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowAI(false)}>Cancelar</Button>
            <Button onPress={handleAIGenerate} loading={loading}>
              Generar
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
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    marginBottom: 12,
  },
  bodyInput: {
    minHeight: 200,
  },
  aiActions: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  sendButton: {
    marginTop: 16,
    marginBottom: 32,
  },
  aiInput: {
    marginBottom: 16,
  },
  toneButtons: {
    marginTop: 8,
  },
});

export default ComposeScreen;
