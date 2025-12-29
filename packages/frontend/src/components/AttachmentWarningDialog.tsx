import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  AlertTitle,
} from '@mui/material';
import { Warning, AttachFile, Send } from '@mui/icons-material';

interface AttachmentWarningDialogProps {
  open: boolean;
  onClose: () => void;
  onSendAnyway: () => void;
  onAddAttachment: () => void;
  warningType: 'missing_attachment' | 'empty_subject' | 'empty_body';
  message: string;
  details: string;
}

const AttachmentWarningDialog: React.FC<AttachmentWarningDialogProps> = ({
  open,
  onClose,
  onSendAnyway,
  onAddAttachment,
  warningType,
  message,
  details,
}) => {
  const getIcon = () => {
    switch (warningType) {
      case 'missing_attachment':
        return <AttachFile sx={{ fontSize: 60, color: '#f57c00' }} />;
      default:
        return <Warning sx={{ fontSize: 60, color: '#f57c00' }} />;
    }
  };

  const getAlertSeverity = () => {
    switch (warningType) {
      case 'missing_attachment':
        return 'warning';
      case 'empty_subject':
        return 'info';
      case 'empty_body':
        return 'info';
      default:
        return 'warning';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          borderTop: '4px solid #f57c00',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {getIcon()}
          <Typography variant="h5" component="span" fontWeight="bold">
            {message}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity={getAlertSeverity()} sx={{ mb: 2 }}>
          <AlertTitle>Advertencia</AlertTitle>
          {details}
        </Alert>

        {warningType === 'missing_attachment' && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Detectamos que mencionaste un archivo adjunto en tu mensaje, pero no hay ningún archivo adjunto.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              ¿Deseas agregar un archivo antes de enviar?
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Cancelar
        </Button>

        {warningType === 'missing_attachment' && (
          <Button
            variant="outlined"
            onClick={onAddAttachment}
            startIcon={<AttachFile />}
            color="primary"
          >
            Agregar adjunto
          </Button>
        )}

        <Button
          variant="contained"
          onClick={onSendAnyway}
          startIcon={<Send />}
          color="warning"
        >
          Enviar de todas formas
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AttachmentWarningDialog;
