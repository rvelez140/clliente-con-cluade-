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
  Menu,
  MenuItem,
  CircularProgress,
  Chip,
} from '@mui/material';
import { Close, AutoAwesome, Send } from '@mui/icons-material';
import { geminiApi, emailApi } from '../services/api';

interface EmailComposerProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
  replyTo?: any;
}

const EmailComposer: React.FC<EmailComposerProps> = ({
  open,
  onClose,
  accountId,
  replyTo,
}) => {
  const [to, setTo] = useState(replyTo?.from || '');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnchor, setAiAnchor] = useState<null | HTMLElement>(null);

  const handleSend = async () => {
    if (!accountId) {
      alert('Por favor, selecciona una cuenta de correo');
      return;
    }

    setLoading(true);
    try {
      await emailApi.sendEmail(accountId, {
        to: to.split(',').map((e: string) => e.trim()),
        subject,
        body,
      });
      onClose();
    } catch (error) {
      console.error('Error enviando correo:', error);
      alert('Error al enviar el correo');
    } finally {
      setLoading(false);
    }
  };

  const handleAiGenerate = async (action: string) => {
    setAiAnchor(null);
    setAiLoading(true);

    try {
      let result;
      switch (action) {
        case 'generate':
          result = await geminiApi.generateEmail({
            prompt: subject || 'Generar un correo profesional',
            context: body,
            tone: 'professional',
            length: 'medium',
          });
          setBody(result.data.text);
          break;
        case 'improve':
          result = await geminiApi.improveDraft(body, 'Mejorar la redacción y gramática');
          setBody(result.data.text);
          break;
        case 'formal':
          result = await geminiApi.improveDraft(body, 'Hacer más formal');
          setBody(result.data.text);
          break;
        case 'concise':
          result = await geminiApi.improveDraft(body, 'Hacer más conciso');
          setBody(result.data.text);
          break;
      }
    } catch (error) {
      console.error('Error con Gemini:', error);
      alert('Error al generar contenido con IA');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSuggestReply = async () => {
    if (!replyTo) return;
    setAiLoading(true);

    try {
      const result = await geminiApi.suggestReply(replyTo.body);
      if (result.data.suggestions && result.data.suggestions.length > 0) {
        setBody(result.data.suggestions[0]);
      }
    } catch (error) {
      console.error('Error sugiriendo respuesta:', error);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>New Message</Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <TextField
          label="To"
          fullWidth
          value={to}
          onChange={(e) => setTo(e.target.value)}
          sx={{ mb: 2 }}
          placeholder="recipient@example.com"
        />
        <TextField
          label="Subject"
          fullWidth
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Box sx={{ position: 'relative' }}>
          <TextField
            label="Message"
            fullWidth
            multiline
            rows={10}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          {aiLoading && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,255,255,0.8)',
              }}
            >
              <CircularProgress />
            </Box>
          )}
        </Box>

        <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<AutoAwesome />}
            label="AI Assistant"
            onClick={(e) => setAiAnchor(e.currentTarget)}
            color="primary"
            variant="outlined"
            size="small"
          />
          {replyTo && (
            <Chip
              icon={<AutoAwesome />}
              label="Suggest Reply"
              onClick={handleSuggestReply}
              color="secondary"
              variant="outlined"
              size="small"
            />
          )}
        </Box>

        <Menu
          anchorEl={aiAnchor}
          open={Boolean(aiAnchor)}
          onClose={() => setAiAnchor(null)}
        >
          <MenuItem onClick={() => handleAiGenerate('generate')}>
            Generate from subject
          </MenuItem>
          <MenuItem onClick={() => handleAiGenerate('improve')}>
            Improve draft
          </MenuItem>
          <MenuItem onClick={() => handleAiGenerate('formal')}>
            Make more formal
          </MenuItem>
          <MenuItem onClick={() => handleAiGenerate('concise')}>
            Make more concise
          </MenuItem>
        </Menu>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSend}
          disabled={loading || !to || !subject}
          startIcon={loading ? <CircularProgress size={16} /> : <Send />}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailComposer;
