import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  Grid,
  Typography,
  Card,
  CardActionArea,
  Tabs,
  Tab,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  SelectChangeEvent,
} from '@mui/material';
import {
  Palette,
  TextFields,
  Image as ImageIcon,
  Preview,
  Save,
  AutoAwesome,
} from '@mui/icons-material';
import { signatureApi } from '../services/api';

interface SignatureEditorProps {
  open: boolean;
  onClose: () => void;
  onSave: (signature: string) => void;
  initialData?: any;
}

interface SignatureData {
  name: string;
  title: string;
  company: string;
  department: string;
  email: string;
  phone: string;
  mobile: string;
  website: string;
  address: string;
  linkedin: string;
  twitter: string;
  github: string;
  slogan: string;
  pronouns: string;
  meetingLink: string;
  profileImage: string;
  logo: string;
}

interface SignatureStyle {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: string;
}

const SignatureEditor: React.FC<SignatureEditorProps> = ({
  open,
  onClose,
  onSave,
  initialData,
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState('');
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('professional-modern');

  const [data, setData] = useState<SignatureData>({
    name: '',
    title: '',
    company: '',
    department: '',
    email: '',
    phone: '',
    mobile: '',
    website: '',
    address: '',
    linkedin: '',
    twitter: '',
    github: '',
    slogan: '',
    pronouns: '',
    meetingLink: '',
    profileImage: '',
    logo: '',
    ...initialData,
  });

  const [style, setStyle] = useState<SignatureStyle>({
    primaryColor: '#1a73e8',
    secondaryColor: '#34a853',
    fontFamily: 'Arial, sans-serif',
    fontSize: '14px',
  });

  const [aiPrompt, setAiPrompt] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Generate preview when data or template changes
  useEffect(() => {
    if (data.name) {
      generatePreview();
    }
  }, [data, style, selectedTemplate]);

  const loadTemplates = async () => {
    try {
      const response = await signatureApi.getTemplates();
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const generatePreview = async () => {
    try {
      const response = await signatureApi.generate({
        data,
        templateId: selectedTemplate,
        style,
      });
      setPreview(response.data.html);
    } catch (error) {
      console.error('Error generating preview:', error);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;

    setLoading(true);
    try {
      const response = await signatureApi.generateWithAI({
        description: aiPrompt,
        data,
      });
      setPreview(response.data.html);
      setSnackbar({
        open: true,
        message: 'Firma generada con IA',
        severity: 'success',
      });
    } catch (error) {
      console.error('Error generating with AI:', error);
      setSnackbar({
        open: true,
        message: 'Error al generar con IA',
        severity: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('emailSignature', preview);
    localStorage.setItem('emailSignatureData', JSON.stringify(data));
    onSave(preview);
    setSnackbar({
      open: true,
      message: 'Firma guardada correctamente',
      severity: 'success',
    });
    onClose();
  };

  const handleDataChange = (field: keyof SignatureData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setData({ ...data, [field]: e.target.value });
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: '80vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h6">Editor de Firma de Correo</Typography>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Left Panel - Editor */}
            <Grid item xs={12} md={6}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                sx={{ mb: 2 }}
              >
                <Tab icon={<TextFields />} label="Datos" />
                <Tab icon={<Palette />} label="Estilo" />
                <Tab icon={<ImageIcon />} label="Plantilla" />
                <Tab icon={<AutoAwesome />} label="IA" />
              </Tabs>

              {/* Data Tab */}
              {activeTab === 0 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Información Personal
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Nombre completo"
                        fullWidth
                        size="small"
                        value={data.name}
                        onChange={handleDataChange('name')}
                        required
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Cargo"
                        fullWidth
                        size="small"
                        value={data.title}
                        onChange={handleDataChange('title')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Empresa"
                        fullWidth
                        size="small"
                        value={data.company}
                        onChange={handleDataChange('company')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Departamento"
                        fullWidth
                        size="small"
                        value={data.department}
                        onChange={handleDataChange('department')}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Contacto
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Email"
                        fullWidth
                        size="small"
                        value={data.email}
                        onChange={handleDataChange('email')}
                        type="email"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Teléfono"
                        fullWidth
                        size="small"
                        value={data.phone}
                        onChange={handleDataChange('phone')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Móvil"
                        fullWidth
                        size="small"
                        value={data.mobile}
                        onChange={handleDataChange('mobile')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Sitio web"
                        fullWidth
                        size="small"
                        value={data.website}
                        onChange={handleDataChange('website')}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="Dirección"
                        fullWidth
                        size="small"
                        value={data.address}
                        onChange={handleDataChange('address')}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Redes Sociales
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="LinkedIn"
                        fullWidth
                        size="small"
                        value={data.linkedin}
                        onChange={handleDataChange('linkedin')}
                        placeholder="URL o usuario"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Twitter"
                        fullWidth
                        size="small"
                        value={data.twitter}
                        onChange={handleDataChange('twitter')}
                        placeholder="@usuario"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="GitHub"
                        fullWidth
                        size="small"
                        value={data.github}
                        onChange={handleDataChange('github')}
                        placeholder="usuario"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Link de reunión"
                        fullWidth
                        size="small"
                        value={data.meetingLink}
                        onChange={handleDataChange('meetingLink')}
                        placeholder="Calendly, Meet, etc."
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Extras
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="Slogan / Frase"
                        fullWidth
                        size="small"
                        value={data.slogan}
                        onChange={handleDataChange('slogan')}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Pronombres"
                        fullWidth
                        size="small"
                        value={data.pronouns}
                        onChange={handleDataChange('pronouns')}
                        placeholder="él/ella/elle"
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Style Tab */}
              {activeTab === 1 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Colores
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        label="Color primario"
                        fullWidth
                        size="small"
                        type="color"
                        value={style.primaryColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setStyle({ ...style, primaryColor: e.target.value })
                        }
                        InputProps={{
                          sx: { height: 56 },
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        label="Color secundario"
                        fullWidth
                        size="small"
                        type="color"
                        value={style.secondaryColor}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setStyle({ ...style, secondaryColor: e.target.value })
                        }
                        InputProps={{
                          sx: { height: 56 },
                        }}
                      />
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Tipografía
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Fuente</InputLabel>
                        <Select
                          value={style.fontFamily}
                          label="Fuente"
                          onChange={(e: SelectChangeEvent) =>
                            setStyle({ ...style, fontFamily: e.target.value })
                          }
                        >
                          <MenuItem value="Arial, sans-serif">Arial</MenuItem>
                          <MenuItem value="'Helvetica Neue', sans-serif">Helvetica</MenuItem>
                          <MenuItem value="Georgia, serif">Georgia</MenuItem>
                          <MenuItem value="'Times New Roman', serif">Times New Roman</MenuItem>
                          <MenuItem value="Verdana, sans-serif">Verdana</MenuItem>
                          <MenuItem value="'Trebuchet MS', sans-serif">Trebuchet MS</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Tamaño de fuente</InputLabel>
                        <Select
                          value={style.fontSize}
                          label="Tamaño de fuente"
                          onChange={(e: SelectChangeEvent) =>
                            setStyle({ ...style, fontSize: e.target.value })
                          }
                        >
                          <MenuItem value="12px">Pequeño (12px)</MenuItem>
                          <MenuItem value="14px">Normal (14px)</MenuItem>
                          <MenuItem value="16px">Grande (16px)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Imágenes
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        label="URL de foto de perfil"
                        fullWidth
                        size="small"
                        value={data.profileImage}
                        onChange={handleDataChange('profileImage')}
                        placeholder="https://..."
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        label="URL del logo de empresa"
                        fullWidth
                        size="small"
                        value={data.logo}
                        onChange={handleDataChange('logo')}
                        placeholder="https://..."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Template Tab */}
              {activeTab === 2 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Selecciona una plantilla
                  </Typography>
                  <Grid container spacing={2}>
                    {templates.map((template) => (
                      <Grid item xs={6} key={template.id}>
                        <Card
                          variant={selectedTemplate === template.id ? 'elevation' : 'outlined'}
                          sx={{
                            borderColor: selectedTemplate === template.id ? 'primary.main' : 'divider',
                            borderWidth: selectedTemplate === template.id ? 2 : 1,
                          }}
                        >
                          <CardActionArea
                            onClick={() => setSelectedTemplate(template.id)}
                            sx={{ p: 2 }}
                          >
                            <Typography variant="subtitle2">{template.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {template.category}
                            </Typography>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}

              {/* AI Tab */}
              {activeTab === 3 && (
                <Box>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Genera tu firma con IA
                  </Typography>
                  <TextField
                    label="Describe tu firma ideal"
                    fullWidth
                    multiline
                    rows={4}
                    value={aiPrompt}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiPrompt(e.target.value)}
                    placeholder="Ej: Quiero una firma profesional y moderna para un desarrollador de software, con colores azules y mis redes sociales..."
                    sx={{ mb: 2 }}
                  />
                  <Button
                    variant="contained"
                    startIcon={loading ? <CircularProgress size={16} /> : <AutoAwesome />}
                    onClick={handleGenerateWithAI}
                    disabled={loading || !aiPrompt.trim()}
                    fullWidth
                  >
                    Generar con IA
                  </Button>
                </Box>
              )}
            </Grid>

            {/* Right Panel - Preview */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: 'grey.100',
                  borderRadius: 2,
                  p: 2,
                  height: '100%',
                  minHeight: 400,
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Preview />
                  <Typography variant="subtitle2">Vista previa</Typography>
                </Box>

                <Box
                  sx={{
                    bgcolor: 'white',
                    borderRadius: 1,
                    p: 3,
                    boxShadow: 1,
                  }}
                >
                  {preview ? (
                    <div dangerouslySetInnerHTML={{ __html: preview }} />
                  ) : (
                    <Typography color="text.secondary" textAlign="center">
                      Completa los datos para ver la vista previa
                    </Typography>
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!data.name}
          >
            Guardar firma
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default SignatureEditor;
