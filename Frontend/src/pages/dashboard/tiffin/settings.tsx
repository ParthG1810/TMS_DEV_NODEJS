import { useState, useEffect, useCallback } from 'react';
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
import { Upload } from '../../../components/upload';

// ----------------------------------------------------------------------

interface AppSettings {
  // Company Information
  company_name: string;
  company_phone: string;
  company_email: string;
  company_address: string;
  company_logo_url: string;

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
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/settings');
      if (response.data.success) {
        setSettings(response.data.data);
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

  const handleLogoUpload = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      try {
        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('logo', acceptedFiles[0]);

        const response = await axios.post('/api/uploads/logo', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data.success) {
          const logoUrl = response.data.data.logoUrl;
          setSettings((prev) => (prev ? { ...prev, company_logo_url: logoUrl } : null));
          enqueueSnackbar('Logo uploaded successfully', { variant: 'success' });
        } else {
          enqueueSnackbar(response.data.error || 'Failed to upload logo', { variant: 'error' });
        }
      } catch (error: any) {
        console.error('Error uploading logo:', error);
        enqueueSnackbar(error.message || 'Failed to upload logo', { variant: 'error' });
      } finally {
        setUploadingLogo(false);
      }
    },
    [enqueueSnackbar]
  );

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
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Company Logo
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                  Upload your company logo (JPEG, PNG, GIF, or WebP, max 5MB). This will appear on invoices and receipts.
                </Typography>
                {settings.company_logo_url && (
                  <Box sx={{ mb: 2 }}>
                    <img
                      src={settings.company_logo_url}
                      alt="Company Logo"
                      style={{ maxHeight: 100, maxWidth: 300, objectFit: 'contain' }}
                    />
                  </Box>
                )}
                <Upload
                  accept={{
                    'image/jpeg': ['.jpg', '.jpeg'],
                    'image/png': ['.png'],
                    'image/gif': ['.gif'],
                    'image/webp': ['.webp'],
                  }}
                  file={null}
                  onDrop={handleLogoUpload}
                  disabled={uploadingLogo}
                  helperText={uploadingLogo ? 'Uploading logo...' : undefined}
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
