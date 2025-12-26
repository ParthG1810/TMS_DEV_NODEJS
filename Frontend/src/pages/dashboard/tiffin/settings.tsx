import { useState, useEffect } from 'react';
import Head from 'next/head';
import {
  Container,
  Card,
  Stack,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  Box,
  Alert,
  Paper,
} from '@mui/material';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';

// ----------------------------------------------------------------------

interface AppSettings {
  // Company Information
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_logo: string;

  // Payment Settings
  etransfer_email: string;
  default_currency: string;

  // Application Settings
  default_timezone: string;
  date_format: string;

  // Server Configuration (read-only from .env)
  port: string;
  node_env: string;

  // Database Configuration (read-only from .env)
  db_host: string;
  db_port: string;
  db_name: string;
}

// ----------------------------------------------------------------------

SettingsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

export default function SettingsPage() {
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings');
      if (response.data.success) {
        setSettings(response.data.data);
        setLogoPreview(response.data.data.company_logo || '');
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load settings', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      enqueueSnackbar(error.message || 'Failed to load settings', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    try {
      setSaving(true);
      const response = await axios.put('/api/settings', settings);
      if (response.data.success) {
        enqueueSnackbar('Settings saved successfully', { variant: 'success' });
        setSettings(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to save settings', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      enqueueSnackbar(error.message || 'Failed to save settings', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof AppSettings) => (event: React.ChangeEvent<HTMLInputElement>) => {
    if (settings) {
      setSettings({
        ...settings,
        [field]: event.target.value,
      });
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      enqueueSnackbar('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.', {
        variant: 'error',
      });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      enqueueSnackbar('File size exceeds 5MB limit', { variant: 'error' });
      return;
    }

    try {
      setUploading(true);

      // Create form data
      const formData = new FormData();
      formData.append('logo', file);

      // Upload to server
      const response = await axios.post('/api/settings/upload-logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const logoUrl = response.data.data.url;
        setLogoPreview(logoUrl);
        if (settings) {
          setSettings({
            ...settings,
            company_logo: logoUrl,
          });
        }
        enqueueSnackbar('Logo uploaded successfully', { variant: 'success' });
      } else {
        enqueueSnackbar(response.data.error || 'Failed to upload logo', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      enqueueSnackbar(error.message || 'Failed to upload logo', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleLogoDelete = async () => {
    try {
      setUploading(true);
      const response = await axios.delete('/api/settings/upload-logo');
      if (response.data.success) {
        setLogoPreview('');
        if (settings) {
          setSettings({
            ...settings,
            company_logo: '',
          });
        }
        enqueueSnackbar('Logo deleted successfully', { variant: 'success' });
      } else {
        enqueueSnackbar(response.data.error || 'Failed to delete logo', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error deleting logo:', error);
      enqueueSnackbar(error.message || 'Failed to delete logo', { variant: 'error' });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  if (!settings) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Typography>Failed to load settings</Typography>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Application Settings | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Application Settings"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Settings' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:save-outline" />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          }
        />

        <Stack spacing={3}>
          {/* Company Information */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Company Information
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Company Logo
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  {logoPreview && (
                    <Box
                      component="img"
                      src={logoPreview}
                      alt="Company Logo"
                      sx={{
                        width: 100,
                        height: 100,
                        objectFit: 'contain',
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        p: 1,
                      }}
                    />
                  )}
                  <Stack spacing={1}>
                    <Button
                      variant="outlined"
                      component="label"
                      startIcon={<Iconify icon="eva:upload-outline" />}
                      disabled={uploading}
                    >
                      {uploading ? 'Uploading...' : 'Upload Logo'}
                      <input
                        type="file"
                        hidden
                        accept="image/*"
                        onChange={handleLogoUpload}
                      />
                    </Button>
                    {logoPreview && (
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Iconify icon="eva:trash-2-outline" />}
                        onClick={handleLogoDelete}
                        disabled={uploading}
                      >
                        Remove Logo
                      </Button>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Recommended: Square image, max 5MB (JPG, PNG, GIF, WebP)
                    </Typography>
                  </Stack>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Name"
                  value={settings.company_name}
                  onChange={handleChange('company_name')}
                  helperText="This will appear on invoices and receipts"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Phone"
                  value={settings.company_phone}
                  onChange={handleChange('company_phone')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Email"
                  type="email"
                  value={settings.company_email}
                  onChange={handleChange('company_email')}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Company Address"
                  value={settings.company_address}
                  onChange={handleChange('company_address')}
                  multiline
                  rows={2}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Payment Settings */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Payment Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="E-Transfer Email"
                  type="email"
                  value={settings.etransfer_email}
                  onChange={handleChange('etransfer_email')}
                  helperText="Email address for receiving E-Transfer payments"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Currency"
                  value={settings.default_currency}
                  onChange={handleChange('default_currency')}
                  helperText="Currency code (e.g., CAD, USD)"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Application Settings */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Application Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Default Timezone"
                  value={settings.default_timezone}
                  onChange={handleChange('default_timezone')}
                  helperText="Timezone for date/time display (e.g., America/Toronto)"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Date Format"
                  value={settings.date_format}
                  onChange={handleChange('date_format')}
                  helperText="Format for displaying dates (e.g., YYYY-MM-DD)"
                />
              </Grid>
            </Grid>
          </Card>

          {/* Environment Variables (Read-Only) */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Environment Configuration
            </Typography>
            <Alert severity="info" sx={{ mb: 3 }}>
              These settings are loaded from the .env file and cannot be changed from the UI. To
              modify them, update the .env file on the server and restart the application.
            </Alert>
            <Divider sx={{ mb: 3 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Server Port"
                  value={settings.port}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Environment"
                  value={settings.node_env}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database Host"
                  value={settings.db_host}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database Port"
                  value={settings.db_port}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  label="Database Name"
                  value={settings.db_name}
                  disabled
                  InputProps={{
                    readOnly: true,
                  }}
                />
              </Grid>
            </Grid>
          </Card>

          {/* Save Button at Bottom */}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<Iconify icon="eva:save-outline" />}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Box>
        </Stack>
      </Container>
    </>
  );
}
