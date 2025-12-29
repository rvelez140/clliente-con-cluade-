import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Switch,
  FormControlLabel,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from '@mui/material';
import {
  Close,
  AutoAwesome,
  Schedule,
  VolumeUp,
  ExpandMore,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { scheduledEmailApi } from '../services/api';

interface ScheduledEmailComposerProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
}

const ScheduledEmailComposer: React.FC<ScheduledEmailComposerProps> = ({
  open,
  onClose,
  accountId,
}) => {
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | null>(new Date());
  const [recurrence, setRecurrence] = useState('none');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date | null>(null);

  // Opciones de IA
  const [useAI, setUseAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState('professional');
  const [aiLoading, setAiLoading] = useState(false);

  // Opciones de voz
  const [useVoice, setUseVoice] = useState(false);
  const [voiceLang, setVoiceLang] = useState('es-ES');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setError('Por favor, ingresa un prompt para la IA');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const result = await scheduledEmailApi.generateWithAI({
        prompt: aiPrompt,
        tone: aiTone,
        context: body,
      });

      setSubject(result.data.subject);
      setBody(result.data.body);
      setUseAI(true);
    } catch (err) {
      console.error('Error generando con IA:', err);
      setError('Error al generar contenido con IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (!body.trim()) {
      setError('No hay contenido para resumir');
      return;
    }

    setAiLoading(true);
    setError('');

    try {
      const result = await scheduledEmailApi.summarize({ emailBody: body });
      setBody(result.data.summary);
    } catch (err) {
      console.error('Error resumiendo:', err);
      setError('Error al resumir el contenido');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!accountId) {
      setError('Por favor, selecciona una cuenta de correo');
      return;
    }

    if (!to.trim()) {
      setError('Por favor, ingresa al menos un destinatario');
      return;
    }

    if (!scheduledAt) {
      setError('Por favor, selecciona una fecha y hora');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await scheduledEmailApi.create({
        accountId,
        toAddresses: to.split(',').map((e) => e.trim()),
        ccAddresses: cc ? cc.split(',').map((e) => e.trim()) : undefined,
        bccAddresses: bcc ? bcc.split(',').map((e) => e.trim()) : undefined,
        subject: subject || 'Sin asunto',
        body,
        scheduledAt: scheduledAt.toISOString(),
        recurrence,
        recurrenceEndDate: recurrenceEndDate?.toISOString(),
        aiGenerated: useAI,
        aiPrompt: useAI ? aiPrompt : undefined,
        aiTone: useAI ? aiTone : undefined,
        useVoice,
        voiceLang,
      });

      onClose();
      // Resetear formulario
      setTo('');
      setCc('');
      setBcc('');
      setSubject('');
      setBody('');
      setScheduledAt(new Date());
      setRecurrence('none');
      setUseAI(false);
      setAiPrompt('');
      setUseVoice(false);
    } catch (err) {
      console.error('Error programando correo:', err);
      setError('Error al programar el correo');
    } finally {
      setLoading(false);
    }
  };

  const handleTestVoice = () => {
    if (!body.trim()) {
      setError('No hay contenido para reproducir');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(body);
    utterance.lang = voiceLang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '90vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Schedule />
            <span>Programar Correo</span>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {/* Destinatarios */}
          <TextField
            label="Para"
            fullWidth
            value={to}
            onChange={(e) => setTo(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="destinatario@ejemplo.com"
            required
          />

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <TextField
              label="CC (opcional)"
              fullWidth
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@ejemplo.com"
            />
            <TextField
              label="BCC (opcional)"
              fullWidth
              value={bcc}
              onChange={(e) => setBcc(e.target.value)}
              placeholder="bcc@ejemplo.com"
            />
          </Box>

          {/* Programación */}
          <Box sx={{ mb: 2 }}>
            <DateTimePicker
              label="Fecha y hora de envío"
              value={scheduledAt}
              onChange={(newValue) => setScheduledAt(newValue)}
              slotProps={{
                textField: {
                  fullWidth: true,
                  required: true,
                },
              }}
            />
          </Box>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Recurrencia</InputLabel>
            <Select
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
              label="Recurrencia"
            >
              <MenuItem value="none">Sin recurrencia</MenuItem>
              <MenuItem value="daily">Diaria</MenuItem>
              <MenuItem value="weekly">Semanal</MenuItem>
              <MenuItem value="monthly">Mensual</MenuItem>
            </Select>
          </FormControl>

          {recurrence !== 'none' && (
            <Box sx={{ mb: 2 }}>
              <DateTimePicker
                label="Fecha de fin de recurrencia (opcional)"
                value={recurrenceEndDate}
                onChange={(newValue) => setRecurrenceEndDate(newValue)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </Box>
          )}

          {/* Asistente de IA */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome color="primary" />
                <Typography>Asistente de IA con Gemini</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <TextField
                  label="Prompt para IA"
                  fullWidth
                  multiline
                  rows={2}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="Ej: Redacta un correo profesional informando sobre la reunión del lunes"
                  sx={{ mb: 2 }}
                />

                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Tono del correo</InputLabel>
                  <Select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    label="Tono del correo"
                  >
                    <MenuItem value="professional">Profesional</MenuItem>
                    <MenuItem value="formal">Formal</MenuItem>
                    <MenuItem value="friendly">Amigable</MenuItem>
                    <MenuItem value="casual">Casual</MenuItem>
                  </Select>
                </FormControl>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    startIcon={aiLoading ? <CircularProgress size={16} /> : <AutoAwesome />}
                    onClick={handleGenerateWithAI}
                    disabled={aiLoading || !aiPrompt.trim()}
                  >
                    Generar con IA
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleSummarize}
                    disabled={aiLoading || !body.trim()}
                  >
                    Resumir
                  </Button>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Contenido del correo */}
          <TextField
            label="Asunto"
            fullWidth
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Mensaje"
            fullWidth
            multiline
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            sx={{ mb: 2 }}
          />

          {/* Opciones de voz */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VolumeUp color="primary" />
                <Typography>Opciones de voz</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={useVoice}
                      onChange={(e) => setUseVoice(e.target.checked)}
                    />
                  }
                  label="Habilitar lectura con voz al enviar"
                />

                <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
                  <InputLabel>Idioma de voz</InputLabel>
                  <Select
                    value={voiceLang}
                    onChange={(e) => setVoiceLang(e.target.value)}
                    label="Idioma de voz"
                    disabled={!useVoice}
                  >
                    <MenuItem value="es-ES">Español (España)</MenuItem>
                    <MenuItem value="es-MX">Español (México)</MenuItem>
                    <MenuItem value="en-US">Inglés (EE.UU.)</MenuItem>
                    <MenuItem value="en-GB">Inglés (Reino Unido)</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<VolumeUp />}
                  onClick={handleTestVoice}
                  disabled={!body.trim()}
                >
                  Probar voz
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSchedule}
            disabled={loading || !to || !scheduledAt}
            startIcon={loading ? <CircularProgress size={16} /> : <Schedule />}
          >
            Programar Envío
          </Button>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default ScheduledEmailComposer;
