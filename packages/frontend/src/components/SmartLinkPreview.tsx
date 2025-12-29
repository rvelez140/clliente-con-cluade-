import React, { useState, useEffect } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Google,
  CloudQueue,
  GitHub,
  Description,
  Folder,
  Link as LinkIcon,
  Close,
  OpenInNew,
} from '@mui/icons-material';
import { searchApi } from '../services/api';

interface LinkMetadata {
  url: string;
  title: string;
  fileName?: string;
  fileType?: string;
  fileSize?: string;
  type: 'google-drive' | 'dropbox' | 'onedrive' | 'github' | 'notion' | 'generic';
  favicon?: string;
}

interface SmartLinkPreviewProps {
  url: string;
  onRemove?: () => void;
  showRemove?: boolean;
  compact?: boolean;
}

const SmartLinkPreview: React.FC<SmartLinkPreviewProps> = ({
  url,
  onRemove,
  showRemove = true,
  compact = false,
}) => {
  const [metadata, setMetadata] = useState<LinkMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        setLoading(true);
        setError(false);
        const response = await searchApi.getLinkMetadata(url);
        setMetadata(response.data);
      } catch (err) {
        console.error('Error fetching link metadata:', err);
        setError(true);
        // Fallback metadata
        setMetadata({
          url,
          title: url,
          type: 'generic',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [url]);

  const getIcon = () => {
    if (!metadata) return <LinkIcon />;

    switch (metadata.type) {
      case 'google-drive':
        return <Google sx={{ color: '#4285f4' }} />;
      case 'dropbox':
        return <CloudQueue sx={{ color: '#0061ff' }} />;
      case 'onedrive':
        return <CloudQueue sx={{ color: '#0078d4' }} />;
      case 'github':
        return <GitHub sx={{ color: '#333' }} />;
      case 'notion':
        return <Description sx={{ color: '#000' }} />;
      default:
        return <LinkIcon sx={{ color: '#666' }} />;
    }
  };

  const getTypeLabel = () => {
    if (!metadata) return '';

    switch (metadata.type) {
      case 'google-drive':
        return 'Google Drive';
      case 'dropbox':
        return 'Dropbox';
      case 'onedrive':
        return 'OneDrive';
      case 'github':
        return 'GitHub';
      case 'notion':
        return 'Notion';
      default:
        return 'Enlace';
    }
  };

  const getBgColor = () => {
    if (!metadata) return '#f5f5f5';

    switch (metadata.type) {
      case 'google-drive':
        return '#e8f0fe';
      case 'dropbox':
        return '#e3f2fd';
      case 'onedrive':
        return '#e3f2fd';
      case 'github':
        return '#f6f8fa';
      case 'notion':
        return '#f7f6f3';
      default:
        return '#f5f5f5';
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 1,
          p: compact ? 0.5 : 1,
          bgcolor: '#f5f5f5',
          borderRadius: 1,
        }}
      >
        <CircularProgress size={16} />
        <Typography variant="caption" color="text.secondary">
          Cargando enlace...
        </Typography>
      </Box>
    );
  }

  if (compact) {
    return (
      <Chip
        icon={getIcon()}
        label={metadata?.fileName || metadata?.title || url}
        size="small"
        variant="outlined"
        onClick={() => window.open(url, '_blank')}
        onDelete={showRemove ? onRemove : undefined}
        sx={{
          maxWidth: 250,
          '& .MuiChip-label': {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          },
        }}
      />
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        p: 1.5,
        bgcolor: getBgColor(),
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 40,
          height: 40,
          borderRadius: 1,
          bgcolor: 'white',
          boxShadow: 1,
        }}
      >
        {getIcon()}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          variant="body2"
          fontWeight="medium"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {metadata?.fileName || metadata?.title || 'Archivo'}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Chip
            label={getTypeLabel()}
            size="small"
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          {metadata?.fileSize && (
            <Typography variant="caption" color="text.secondary">
              {metadata.fileSize}
            </Typography>
          )}
          {metadata?.fileType && (
            <Typography variant="caption" color="text.secondary">
              • {metadata.fileType}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Abrir enlace">
          <IconButton
            size="small"
            onClick={() => window.open(url, '_blank')}
          >
            <OpenInNew fontSize="small" />
          </IconButton>
        </Tooltip>

        {showRemove && (
          <Tooltip title="Quitar enlace">
            <IconButton size="small" onClick={onRemove}>
              <Close fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Paper>
  );
};

export default SmartLinkPreview;
