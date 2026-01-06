import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Tooltip,
  Divider,
  Typography,
  Paper,
  Stack,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Close,
  AutoAwesome,
  Send,
  AttachFile,
  Search,
  DriveFileRenameOutline,
} from '@mui/icons-material';
import { geminiApi, emailApi, attachmentApi, searchApi } from '../services/api';
import AttachmentWarningDialog from './AttachmentWarningDialog';
import SmartLinkPreview from './SmartLinkPreview';
import SearchBar from './SearchBar';

interface EmailComposerEnhancedProps {
  open: boolean;
  onClose: () => void;
  accountId?: string;
  replyTo?: {
    from: string;
    subject: string;
    body: string;
  };
  defaultSignature?: string;
}

interface LinkMetadata {
  url: string;
  title: string;
  fileName?: string;
  type: string;
}

const EmailComposerEnhanced: React.FC<EmailComposerEnhancedProps> = ({
  open,
  onClose,
  accountId,
  replyTo,
  defaultSignature,
}) => {
  // Form state
  const [to, setTo] = useState(replyTo?.from || '');
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(replyTo ? `Re: ${replyTo.subject}` : '');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState(defaultSignature || '');

  // Attachments
  const [attachments, setAttachments] = useState<File[]>([]);
  const [smartLinks, setSmartLinks] = useState<LinkMetadata[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnchor, setAiAnchor] = useState<null | HTMLElement>(null);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // Warning dialog
  const [warningDialog, setWarningDialog] = useState<{
    open: boolean;
    type: 'missing_attachment' | 'empty_subject' | 'empty_body';
    message: string;
    details: string;
  }>({ open: false, type: 'missing_attachment', message: '', details: '' });

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // Load default signature
  useEffect(() => {
    if (!defaultSignature) {
      loadDefaultSignature();
    }
  }, []);

  const loadDefaultSignature = async () => {
    try {
      const savedSignature = localStorage.getItem('emailSignature');
      if (savedSignature) {
        setSignature(savedSignature);
      }
    } catch (error) {
      console.error('Error loading signature:', error);
    }
  };

  // Handle paste from clipboard for smart links
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const pastedText = e.clipboardData.getData('text');

    // Check if pasted content contains URLs
    const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`[\]]+)/g;
    const urls = pastedText.match(urlRegex);

    if (urls && urls.length > 0) {
      // Process each URL
      for (const url of urls) {
        // Check if it's a cloud storage link
        const isCloudLink =
          url.includes('drive.google.com') ||
          url.includes('dropbox.com') ||
          url.includes('onedrive.live.com') ||
          url.includes('1drv.ms') ||
          url.includes('sharepoint.com') ||
          url.includes('github.com') ||
          url.includes('notion.so');

        if (isCloudLink) {
          e.preventDefault();

          try {
            const response = await searchApi.getLinkMetadata(url);
            const metadata = response.data;

            setSmartLinks((prev: LinkMetadata[]) => [...prev, metadata]);

            // Insert friendly link text instead of URL
            const linkText = `[${metadata.fileName || metadata.title}]`;
            const cursorPos = (e.target as HTMLTextAreaElement).selectionStart;
            const newBody =
              body.substring(0, cursorPos) +
              linkText +
              body.substring(cursorPos);
            setBody(newBody);

            setSnackbar({
              open: true,
              message: `Enlace "${metadata.fileName || metadata.title}" agregado`,
              severity: 'success',
            });
          } catch (error) {
            console.error('Error processing link:', error);
          }
        }
      }
    }
  }, [body]);

  // Pre-flight check before sending
  const handlePreSend = async () => {
    try {
      const response = await attachmentApi.preflight({
        subject,
        body,
        attachments: attachments.map((f: File) => ({ name: f.name })),
      });

      const { canSend, warning } = response.data;

      if (!canSend && warning) {
        setWarningDialog({
          open: true,
          type: warning.type,
          message: warning.message,
          details: warning.details,
        });
        return;
      }

      // If all checks pass, send the email
      await handleSend();
    } catch (error) {
      console.error('Error in preflight check:', error);
      // If preflight fails, still try to send
      await handleSend();
    }
  };

  // Send email
  const handleSend = async () => {
    if (!accountId) {
      setSnackbar({
        open: true,
        message: 'Por favor, selecciona una cuenta de correo',
        severity: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      // Combine body with smart links and signature
      let finalBody = body;

      // Add smart links as proper HTML links
      if (smartLinks.length > 0) {
        finalBody += '\n\n---\nEnlaces adjuntos:\n';
        smartLinks.forEach((link: LinkMetadata) => {
          finalBody += `• ${link.fileName || link.title}: ${link.url}\n`;
        });
      }

      // Add signature
      if (signature) {
        finalBody += `\n\n${signature}`;
      }

      await emailApi.sendEmail(accountId, {
        to: to.split(',').map((e: string) => e.trim()),
        cc: cc ? cc.split(',').map((e: string) => e.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map((e: string) => e.trim()) : undefined,
        subject,
        body: finalBody,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      setSnackbar({
        open: true,
        message: 'Correo enviado correctamente',
        severity: 'success',
      });

      onClose();
    } catch (error) {
      console.error('Error enviando correo:', error);
      setSnackbar({
        open: true,
        message: 'Error al enviar el correo',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  // AI generation handlers
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
        case 'translate-en':
          result = await geminiApi.improveDraft(body, 'Traducir al inglés');
          setBody(result.data.text);
          break;
        case 'translate-es':
          result = await geminiApi.improveDraft(body, 'Traducir al español');
          setBody(result.data.text);
          break;
      }
    } catch (error) {
      console.error('Error con IA:', error);
      setSnackbar({
        open: true,
        message: 'Error al generar contenido con IA',
        severity: 'error',
      });
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

  // File attachment handlers
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setAttachments((prev: File[]) => [...prev, ...Array.from(files)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev: File[]) => prev.filter((_: File, i: number) => i !== index));
  };

  const handleRemoveSmartLink = (index: number) => {
    setSmartLinks((prev: LinkMetadata[]) => prev.filter((_: LinkMetadata, i: number) => i !== index));
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '80vh',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6">Nuevo mensaje</Typography>
            {showSearch && (
              <Chip
                icon={<Search />}
                label="Búsqueda activa"
                size="small"
                onDelete={() => setShowSearch(false)}
              />
            )}
          </Box>
          <Box>
            <Tooltip title="Buscar en internet">
              <IconButton onClick={() => setShowSearch(!showSearch)} size="small">
                <Search />
              </IconButton>
            </Tooltip>
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {/* Search bar */}
          {showSearch && (
            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
              <SearchBar
                placeholder="Buscar información para tu correo..."
                onSearch={(_query: string, results: { answer?: string }) => {
                  if (results.answer) {
                    setBody((prev: string) => prev + '\n\n' + results.answer);
                  }
                }}
              />
            </Box>
          )}

          <Box sx={{ p: 2 }}>
            {/* Recipients */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TextField
                label="Para"
                fullWidth
                value={to}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)}
                size="small"
                placeholder="destinatario@ejemplo.com"
              />
              <Button
                size="small"
                onClick={() => setShowCcBcc(!showCcBcc)}
                sx={{ minWidth: 'auto' }}
              >
                CC/CCO
              </Button>
            </Box>

            {showCcBcc && (
              <Stack spacing={1} sx={{ mt: 1 }}>
                <TextField
                  label="CC"
                  fullWidth
                  value={cc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCc(e.target.value)}
                  size="small"
                />
                <TextField
                  label="CCO"
                  fullWidth
                  value={bcc}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBcc(e.target.value)}
                  size="small"
                />
              </Stack>
            )}

            {/* Subject */}
            <TextField
              label="Asunto"
              fullWidth
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              sx={{ mt: 2 }}
              size="small"
            />

            {/* Body */}
            <Box sx={{ position: 'relative', mt: 2 }}>
              <TextField
                placeholder="Escribe tu mensaje aquí..."
                fullWidth
                multiline
                rows={12}
                value={body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
                onPaste={handlePaste}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontFamily: 'inherit',
                  },
                }}
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
                    borderRadius: 1,
                  }}
                >
                  <CircularProgress />
                </Box>
              )}
            </Box>

            {/* Smart Links Preview */}
            {smartLinks.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Enlaces compartidos ({smartLinks.length})
                </Typography>
                <Stack spacing={1}>
                {smartLinks.map((link: LinkMetadata, index: number) => (
                    <SmartLinkPreview
                      key={index}
                      url={link.url}
                      onRemove={() => handleRemoveSmartLink(index)}
                    />
                  ))}
                </Stack>
              </Box>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Archivos adjuntos ({attachments.length})
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {attachments.map((file: File, index: number) => (
                    <Chip
                      key={index}
                      icon={<AttachFile />}
                      label={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                      onDelete={() => handleRemoveAttachment(index)}
                      variant="outlined"
                      size="small"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Signature preview */}
            {signature && (
              <Paper
                variant="outlined"
                sx={{ mt: 2, p: 2, bgcolor: 'grey.50' }}
              >
                <Typography variant="caption" color="text.secondary">
                  Firma
                </Typography>
                <div dangerouslySetInnerHTML={{ __html: signature }} />
              </Paper>
            )}

            {/* AI and formatting toolbar */}
            <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                icon={<AutoAwesome />}
                label="Asistente IA"
                onClick={(e: React.MouseEvent<HTMLDivElement>) => setAiAnchor(e.currentTarget)}
                color="primary"
                variant="outlined"
                size="small"
              />
              {replyTo && (
                <Chip
                  icon={<AutoAwesome />}
                  label="Sugerir respuesta"
                  onClick={handleSuggestReply}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              )}
              <Chip
                icon={<AttachFile />}
                label="Adjuntar"
                onClick={() => fileInputRef.current?.click()}
                variant="outlined"
                size="small"
              />
              <Chip
                icon={<DriveFileRenameOutline />}
                label="Firma"
                variant="outlined"
                size="small"
                onClick={() => {
                  // Toggle signature visibility
                  if (signature) {
                    setSignature('');
                  } else {
                    loadDefaultSignature();
                  }
                }}
              />
            </Box>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              style={{ display: 'none' }}
            />

            {/* AI Menu */}
            <Menu
              anchorEl={aiAnchor}
              open={Boolean(aiAnchor)}
              onClose={() => setAiAnchor(null)}
            >
              <MenuItem onClick={() => handleAiGenerate('generate')}>
                <AutoAwesome sx={{ mr: 1 }} /> Generar desde asunto
              </MenuItem>
              <MenuItem onClick={() => handleAiGenerate('improve')}>
                Mejorar redacción
              </MenuItem>
              <MenuItem onClick={() => handleAiGenerate('formal')}>
                Hacer más formal
              </MenuItem>
              <MenuItem onClick={() => handleAiGenerate('concise')}>
                Hacer más conciso
              </MenuItem>
              <Divider />
              <MenuItem onClick={() => handleAiGenerate('translate-en')}>
                Traducir al inglés
              </MenuItem>
              <MenuItem onClick={() => handleAiGenerate('translate-es')}>
                Traducir al español
              </MenuItem>
            </Menu>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handlePreSend}
            disabled={loading || !to || !subject}
            startIcon={loading ? <CircularProgress size={16} /> : <Send />}
          >
            Enviar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attachment Warning Dialog */}
      <AttachmentWarningDialog
        open={warningDialog.open}
        onClose={() => setWarningDialog({ ...warningDialog, open: false })}
        onSendAnyway={() => {
          setWarningDialog({ ...warningDialog, open: false });
          handleSend();
        }}
        onAddAttachment={() => {
          setWarningDialog({ ...warningDialog, open: false });
          fileInputRef.current?.click();
        }}
        warningType={warningDialog.type}
        message={warningDialog.message}
        details={warningDialog.details}
      />

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default EmailComposerEnhanced;
