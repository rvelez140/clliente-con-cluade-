import React from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Inbox,
  StarBorder,
  Send,
  Drafts,
  Delete,
  AccountCircle,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  onCompose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onCompose }) => {
  const { logout, user } = useAuth();
  const { currentTheme, setTheme, toggleDarkMode, isDarkMode } = useTheme();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const menuItems = [
    { icon: <Inbox />, text: 'Inbox', count: 0 },
    { icon: <StarBorder />, text: 'Starred' },
    { icon: <Send />, text: 'Sent' },
    { icon: <Drafts />, text: 'Drafts' },
    { icon: <Delete />, text: 'Trash' },
  ];

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 260,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 260,
          boxSizing: 'border-box',
          borderRight: `1px solid ${currentTheme.colors.border}`,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: 1,
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 'bold',
              }}
            >
              G
            </Box>
            <Box>
              <Box sx={{ fontSize: 14, fontWeight: 'bold' }}>Gemini Mail</Box>
            </Box>
          </Box>
          <IconButton onClick={handleMenu} size="small">
            <AccountCircle />
          </IconButton>
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
            <MenuItem disabled>
              <Box sx={{ fontSize: 12, color: 'text.secondary' }}>{user?.email}</Box>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { toggleDarkMode(); handleClose(); }}>
              <ListItemIcon>
                {isDarkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </ListItemIcon>
              <ListItemText>{isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}</ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setTheme('gmail'); handleClose(); }}>
              Tema Gmail
            </MenuItem>
            <MenuItem onClick={() => { setTheme('outlook'); handleClose(); }}>
              Tema Outlook
            </MenuItem>
            <Divider />
            <MenuItem onClick={logout}>Cerrar Sesión</MenuItem>
          </Menu>
        </Box>
        <Button
          variant="contained"
          fullWidth
          onClick={onCompose}
          sx={{
            textTransform: 'none',
            borderRadius: 2,
            py: 1.5,
          }}
        >
          New message
        </Button>
      </Box>

      <List sx={{ px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 1,
                '&:hover': {
                  backgroundColor: currentTheme.colors.hover,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
              {item.count !== undefined && item.count > 0 && (
                <Box
                  sx={{
                    fontSize: 12,
                    color: 'text.secondary',
                  }}
                >
                  {item.count}
                </Box>
              )}
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
};

export default Sidebar;
