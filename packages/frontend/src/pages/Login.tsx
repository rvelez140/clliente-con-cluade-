import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Tab,
  Tabs,
  Alert,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (tab === 0) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al autenticar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      <Card sx={{ width: 500, maxWidth: '90%' }}>
        <CardContent>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 80,
                height: 80,
                borderRadius: 2,
                backgroundColor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                fontWeight: 'bold',
                margin: '0 auto 16px',
              }}
            >
              G
            </Box>
            <Typography variant="h4" fontWeight="bold">
              Gemini Mail
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Personalize your experience
            </Typography>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="Iniciar Sesión" />
            <Tab label="Registrarse" />
          </Tabs>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            {tab === 1 && (
              <TextField
                label="Nombre"
                fullWidth
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ mb: 2 }}
                required
              />
            )}
            <TextField
              label="Email"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              required
            />
            <TextField
              label="Contraseña"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              disabled={loading}
            >
              {tab === 0 ? 'Iniciar Sesión' : 'Registrarse'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
