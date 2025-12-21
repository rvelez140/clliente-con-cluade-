import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import {
  ArrowBack,
  Reply,
  ReplyAll,
  Forward,
  Star,
  StarBorder,
  MoreVert,
} from '@mui/icons-material';
import { Email } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface EmailViewerProps {
  email: Email | null;
  onBack: () => void;
  onReply: () => void;
}

const EmailViewer: React.FC<EmailViewerProps> = ({ email, onBack, onReply }) => {
  const { currentTheme } = useTheme();

  if (!email) {
    return (
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography color="text.secondary">
          Selecciona un correo para verlo
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${currentTheme.colors.border}`,
          display: 'flex',
          gap: 1,
        }}
      >
        <IconButton onClick={onBack}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flex: 1 }} />
        <IconButton>
          {email.isStarred ? <Star color="warning" /> : <StarBorder />}
        </IconButton>
        <IconButton>
          <MoreVert />
        </IconButton>
      </Box>

      <Box sx={{ p: 3, flex: 1, overflow: 'auto' }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          {email.subject}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 3 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              fontWeight: 'bold',
              mr: 2,
            }}
          >
            {email.from[0]?.toUpperCase()}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body1" fontWeight="bold">
                {email.from}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(email.receivedAt).toLocaleString()}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              to {email.to.join(', ')}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        <Box
          sx={{ mb: 3 }}
          dangerouslySetInnerHTML={{ __html: email.htmlBody || email.body }}
        />

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Reply />}
            onClick={onReply}
          >
            Reply
          </Button>
          <Button variant="outlined" startIcon={<ReplyAll />}>
            Reply all
          </Button>
          <Button variant="outlined" startIcon={<Forward />}>
            Forward
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default EmailViewer;
