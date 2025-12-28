import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Appbar, TextInput, Button, Card, Text, Chip, SegmentedButtons } from 'react-native-paper';
import { geminiApi } from '../services/api';

const AIAssistantScreen = ({ navigation }: any) => {
  const [mode, setMode] = useState<'generate' | 'improve' | 'reply'>('generate');
  const [prompt, setPrompt] = useState('');
  const [draft, setDraft] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [tone, setTone] = useState('professional');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!prompt) {
      Alert.alert('Error', 'Por favor ingresa una descripción');
      return;
    }

    setLoading(true);
    try {
      const response = await geminiApi.generateEmail({ prompt, tone });
      setResult(`Asunto: ${response.data.subject}\n\n${response.data.body}`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al generar');
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async () => {
    if (!draft) {
      Alert.alert('Error', 'Por favor ingresa un borrador');
      return;
    }

    setLoading(true);
    try {
      const response = await geminiApi.improveDraft(draft, tone);
      setResult(response.data.improvedDraft);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al mejorar');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!emailBody) {
      Alert.alert('Error', 'Por favor ingresa el email');
      return;
    }

    setLoading(true);
    try {
      const response = await geminiApi.suggestReply(emailBody, tone);
      setResult(response.data.suggestedReply);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || 'Error al sugerir respuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = () => {
    switch (mode) {
      case 'generate':
        handleGenerate();
        break;
      case 'improve':
        handleImprove();
        break;
      case 'reply':
        handleSuggestReply();
        break;
    }
  };

  const copyToClipboard = () => {
    Alert.alert('Copiado', 'Resultado copiado al portapapeles');
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Asistente IA" />
      </Appbar.Header>

      <ScrollView style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.title}>
              ¿Qué quieres hacer?
            </Text>

            <SegmentedButtons
              value={mode}
              onValueChange={(value) => setMode(value as any)}
              buttons={[
                { value: 'generate', label: 'Generar' },
                { value: 'improve', label: 'Mejorar' },
                { value: 'reply', label: 'Responder' },
              ]}
              style={styles.modeButtons}
            />

            <Text variant="bodyMedium" style={styles.description}>
              {mode === 'generate' && 'Genera un email completo desde una descripción'}
              {mode === 'improve' && 'Mejora un borrador existente'}
              {mode === 'reply' && 'Sugiere una respuesta a un email'}
            </Text>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.title}>
              Tono
            </Text>

            <View style={styles.toneChips}>
              <Chip
                selected={tone === 'professional'}
                onPress={() => setTone('professional')}
                style={styles.chip}
              >
                Profesional
              </Chip>
              <Chip
                selected={tone === 'casual'}
                onPress={() => setTone('casual')}
                style={styles.chip}
              >
                Casual
              </Chip>
              <Chip
                selected={tone === 'formal'}
                onPress={() => setTone('formal')}
                style={styles.chip}
              >
                Formal
              </Chip>
              <Chip
                selected={tone === 'friendly'}
                onPress={() => setTone('friendly')}
                style={styles.chip}
              >
                Amigable
              </Chip>
            </View>
          </Card.Content>
        </Card>

        {mode === 'generate' && (
          <TextInput
            label="Describe el email que quieres escribir"
            value={prompt}
            onChangeText={setPrompt}
            mode="outlined"
            multiline
            numberOfLines={6}
            style={styles.input}
            placeholder="Ej: Escribe un email agradeciendo a un cliente por su compra"
          />
        )}

        {mode === 'improve' && (
          <TextInput
            label="Pega tu borrador aquí"
            value={draft}
            onChangeText={setDraft}
            mode="outlined"
            multiline
            numberOfLines={8}
            style={styles.input}
          />
        )}

        {mode === 'reply' && (
          <TextInput
            label="Pega el email al que quieres responder"
            value={emailBody}
            onChangeText={setEmailBody}
            mode="outlined"
            multiline
            numberOfLines={8}
            style={styles.input}
          />
        )}

        <Button
          mode="contained"
          onPress={handleAction}
          loading={loading}
          disabled={loading}
          icon="sparkles"
          style={styles.generateButton}
        >
          {mode === 'generate' && 'Generar Email'}
          {mode === 'improve' && 'Mejorar Borrador'}
          {mode === 'reply' && 'Sugerir Respuesta'}
        </Button>

        {result && (
          <Card style={styles.resultCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.resultTitle}>
                Resultado
              </Text>
              <Text variant="bodyMedium" style={styles.resultText}>
                {result}
              </Text>
            </Card.Content>
            <Card.Actions>
              <Button onPress={copyToClipboard} icon="content-copy">
                Copiar
              </Button>
              <Button
                onPress={() => {
                  navigation.navigate('Compose', { generatedContent: result });
                }}
                icon="send"
              >
                Usar en Email
              </Button>
            </Card.Actions>
          </Card>
        )}
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
  card: {
    marginBottom: 16,
  },
  title: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  description: {
    color: '#666',
    marginTop: 12,
  },
  modeButtons: {
    marginTop: 8,
  },
  toneChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  generateButton: {
    marginBottom: 24,
  },
  resultCard: {
    marginBottom: 24,
    backgroundColor: '#e8f5e9',
  },
  resultTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  resultText: {
    lineHeight: 22,
  },
});

export default AIAssistantScreen;
