import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Delete,
  Edit,
  Schedule,
  CheckCircle,
  Error as ErrorIcon,
  Cancel,
  Refresh,
} from '@mui/icons-material';
import { scheduledEmailApi } from '../services/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface ScheduledEmail {
  id: number;
  toAddresses: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  recurrence?: string;
  aiGenerated?: boolean;
  useVoice?: boolean;
  errorMessage?: string;
}

const ScheduledEmailList: React.FC = () => {
  const [emails, setEmails] = useState<ScheduledEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailToDelete, setEmailToDelete] = useState<number | null>(null);

  const loadScheduledEmails = async () => {
    setLoading(true);
    setError('');

    try {
      const result = await scheduledEmailApi.getAll();
      setEmails(result.data);
    } catch (err) {
      console.error('Error cargando correos programados:', err);
      setError('Error al cargar los correos programados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScheduledEmails();
  }, []);

  const handleDelete = async () => {
    if (!emailToDelete) return;

    try {
      await scheduledEmailApi.delete(emailToDelete);
      setEmails(emails.filter((e) => e.id !== emailToDelete));
      setDeleteDialogOpen(false);
      setEmailToDelete(null);
    } catch (err) {
      console.error('Error eliminando correo programado:', err);
      setError('Error al eliminar el correo programado');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'sent':
        return 'success';
      case 'failed':
        return 'error';
      case 'cancelled':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Schedule />;
      case 'sent':
        return <CheckCircle />;
      case 'failed':
        return <ErrorIcon />;
      case 'cancelled':
        return <Cancel />;
      default:
        return <Schedule />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'sent':
        return 'Enviado';
      case 'failed':
        return 'Fallido';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Correos Programados</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadScheduledEmails}
        >
          Actualizar
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {emails.length === 0 ? (
        <Alert severity="info">No hay correos programados</Alert>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {emails.map((email) => (
            <Card key={email.id} variant="outlined">
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {email.subject || 'Sin asunto'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Para: {email.toAddresses.join(', ')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Programado para: {format(new Date(email.scheduledAt), "PPpp", { locale: es })}
                    </Typography>
                    {email.body && (
                      <Typography
                        variant="body2"
                        sx={{
                          mt: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {email.body}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {email.status === 'pending' && (
                      <>
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setEmailToDelete(email.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Delete />
                        </IconButton>
                      </>
                    )}
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Chip
                    icon={getStatusIcon(email.status)}
                    label={getStatusLabel(email.status)}
                    color={getStatusColor(email.status) as any}
                    size="small"
                  />
                  {email.recurrence && email.recurrence !== 'none' && (
                    <Chip
                      label={`Recurrente: ${email.recurrence}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {email.aiGenerated && (
                    <Chip
                      label="Generado con IA"
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  )}
                  {email.useVoice && (
                    <Chip
                      label="Con voz"
                      size="small"
                      variant="outlined"
                      color="secondary"
                    />
                  )}
                </Box>

                {email.errorMessage && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {email.errorMessage}
                  </Alert>
                )}
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          ¿Estás seguro de que deseas eliminar este correo programado?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScheduledEmailList;
