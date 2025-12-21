import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
} from '@mui/material';
import { StarBorder, Star } from '@mui/icons-material';
import { Email } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface EmailListProps {
  emails: Email[];
  selectedEmail: Email | null;
  onSelectEmail: (email: Email) => void;
}

const EmailList: React.FC<EmailListProps> = ({ emails, selectedEmail, onSelectEmail }) => {
  const { currentTheme } = useTheme();

  return (
    <Box
      sx={{
        width: 400,
        borderRight: `1px solid ${currentTheme.colors.border}`,
        overflow: 'auto',
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${currentTheme.colors.border}`,
        }}
      >
        <Typography variant="h6">Primary</Typography>
      </Box>
      <List sx={{ p: 0 }}>
        {emails.map((email) => (
          <ListItem
            key={email.id}
            disablePadding
            sx={{
              borderBottom: `1px solid ${currentTheme.colors.border}`,
              backgroundColor: selectedEmail?.id === email.id
                ? currentTheme.colors.hover
                : 'transparent',
            }}
          >
            <ListItemButton
              onClick={() => onSelectEmail(email)}
              sx={{ px: 2, py: 1.5 }}
            >
              <Checkbox size="small" sx={{ mr: 1 }} />
              <IconButton size="small" sx={{ mr: 1 }}>
                {email.isStarred ? <Star color="warning" /> : <StarBorder />}
              </IconButton>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: email.isRead ? 400 : 700,
                        fontSize: 14,
                      }}
                    >
                      {email.from}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(email.receivedAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                }
                secondary={
                  <Box>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: email.isRead ? 400 : 700,
                        fontSize: 13,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {email.subject}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {email.body}
                    </Typography>
                  </Box>
                }
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default EmailList;
