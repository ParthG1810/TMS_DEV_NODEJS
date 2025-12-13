import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
  Container,
  Card,
  Stack,
  Typography,
  Button,
  Divider,
  Grid,
  Box,
  Alert,
  CircularProgress,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import ConfirmDialog from '../../../components/confirm-dialog';

// ----------------------------------------------------------------------

interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
  syncEnabled?: boolean;
  accountName?: string;
}

// ----------------------------------------------------------------------

PaymentSettingsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function PaymentSettingsPage() {
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });
  const [openDisconnect, setOpenDisconnect] = useState(false);
  const [openResetSync, setOpenResetSync] = useState(false);

  const fetchGmailStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/gmail/status');
      if (response.data.success) {
        setGmailStatus(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching Gmail status:', error);
      enqueueSnackbar('Failed to fetch Gmail connection status', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchGmailStatus();
  }, [fetchGmailStatus]);

  const handleConnectGmail = async () => {
    try {
      const response = await axios.get('/api/gmail/auth');
      if (response.data.success && response.data.data.authUrl) {
        window.location.href = response.data.data.authUrl;
      } else {
        enqueueSnackbar('Failed to get authorization URL', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error connecting Gmail:', error);
      enqueueSnackbar(error.message || 'Failed to connect Gmail', { variant: 'error' });
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      const response = await axios.delete('/api/gmail/disconnect');
      if (response.data.success) {
        enqueueSnackbar('Gmail disconnected successfully', { variant: 'success' });
        setGmailStatus({ connected: false });
        setOpenDisconnect(false);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to disconnect Gmail', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error disconnecting Gmail:', error);
      enqueueSnackbar(error.message || 'Failed to disconnect Gmail', { variant: 'error' });
    }
  };

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await axios.post('/api/gmail/sync');
      if (response.data.success) {
        const { totalProcessed, totalNewTransactions } = response.data.data;
        enqueueSnackbar(
          `Sync complete: ${totalProcessed} emails processed, ${totalNewTransactions} transactions created`,
          { variant: 'success' }
        );
        fetchGmailStatus();
      } else {
        enqueueSnackbar(response.data.error || 'Sync failed', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error syncing:', error);
      enqueueSnackbar(error.message || 'Sync failed', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const handleResetSync = async () => {
    try {
      setResetting(true);
      const response = await axios.post('/api/gmail/reset-sync');
      if (response.data.success) {
        enqueueSnackbar('Sync state reset. Click "Sync Now" to re-scan all emails.', { variant: 'success' });
        setOpenResetSync(false);
        fetchGmailStatus();
      } else {
        enqueueSnackbar(response.data.error || 'Reset failed', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error resetting sync:', error);
      enqueueSnackbar(error.message || 'Reset failed', { variant: 'error' });
    } finally {
      setResetting(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Payment Settings | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Payment Settings"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Settings' },
          ]}
        />

        <Stack spacing={3}>
          {/* Gmail Connection */}
          <Card sx={{ p: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  component="img"
                  src="/assets/icons/apps/ic_gmail.svg"
                  sx={{ width: 40, height: 40 }}
                  onError={(e: any) => {
                    e.target.style.display = 'none';
                  }}
                />
                <Box>
                  <Typography variant="h6">Gmail Connection</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Connect your Gmail to automatically scan Interac e-Transfer emails
                  </Typography>
                </Box>
              </Stack>
              {gmailStatus.connected && (
                <Chip
                  icon={<Iconify icon="eva:checkmark-circle-2-fill" />}
                  label="Connected"
                  color="success"
                  variant="soft"
                />
              )}
            </Stack>

            <Divider sx={{ mb: 3 }} />

            {gmailStatus.connected ? (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Connected Email
                      </Typography>
                      <Typography variant="body1">{gmailStatus.email}</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last Sync
                      </Typography>
                      <Typography variant="body1">
                        {formatDate(gmailStatus.lastSyncAt)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Sync Status
                      </Typography>
                      <Box>
                        <Chip
                          size="small"
                          label={gmailStatus.syncEnabled ? 'Auto-sync enabled' : 'Auto-sync disabled'}
                          color={gmailStatus.syncEnabled ? 'success' : 'default'}
                          variant="soft"
                        />
                      </Box>
                    </Box>
                  </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Stack spacing={2} alignItems="flex-start">
                    <Button
                      variant="contained"
                      startIcon={syncing ? <CircularProgress size={20} /> : <Iconify icon="eva:sync-outline" />}
                      onClick={handleManualSync}
                      disabled={syncing || resetting}
                    >
                      {syncing ? 'Syncing...' : 'Sync Now'}
                    </Button>
                    <Tooltip title="Reset the sync marker to re-scan all emails from the last 60 days">
                      <Button
                        variant="outlined"
                        color="warning"
                        startIcon={resetting ? <CircularProgress size={20} /> : <Iconify icon="eva:refresh-outline" />}
                        onClick={() => setOpenResetSync(true)}
                        disabled={syncing || resetting}
                      >
                        {resetting ? 'Resetting...' : 'Reset & Re-scan'}
                      </Button>
                    </Tooltip>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<Iconify icon="eva:close-circle-outline" />}
                      onClick={() => setOpenDisconnect(true)}
                    >
                      Disconnect Gmail
                    </Button>
                  </Stack>
                </Grid>
              </Grid>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Connect your Gmail account to automatically import Interac e-Transfer notifications.
                  The system will scan for emails from notify@payments.interac.ca every 30 minutes.
                </Alert>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Iconify icon="eva:link-2-outline" />}
                  onClick={handleConnectGmail}
                >
                  Connect Gmail Account
                </Button>
              </Box>
            )}
          </Card>

          {/* Sync Information */}
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              How It Works
            </Typography>
            <Divider sx={{ mb: 3 }} />
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2" color="primary">1</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Automatic Scanning</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Every 30 minutes, the system scans your Gmail for Interac e-Transfer emails from notify@payments.interac.ca
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2" color="primary">2</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Data Extraction</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Payment details (date, reference number, sender name, amount) are automatically extracted and stored
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2" color="primary">3</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Customer Matching</Typography>
                  <Typography variant="body2" color="text.secondary">
                    The system automatically matches the sender name to your customers. You can confirm or change the match before allocating
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.lighter',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Typography variant="subtitle2" color="primary">4</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle2">Payment Allocation</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Allocate payments to invoices. The oldest 3 unpaid invoices are auto-selected. Excess amounts are stored as customer credit
                  </Typography>
                </Box>
              </Stack>
            </Stack>
          </Card>

          {/* First Time Connection Info */}
          {!gmailStatus.connected && (
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                First Time Connection
              </Typography>
              <Divider sx={{ mb: 3 }} />
              <Alert severity="info">
                When you first connect your Gmail, the system will import Interac e-Transfer emails from the last 60 days.
                Subsequent syncs will only fetch new emails.
              </Alert>
            </Card>
          )}
        </Stack>
      </Container>

      <ConfirmDialog
        open={openDisconnect}
        onClose={() => setOpenDisconnect(false)}
        title="Disconnect Gmail"
        content="Are you sure you want to disconnect your Gmail account? This will stop automatic email scanning. Your existing transaction data will be preserved."
        action={
          <Button variant="contained" color="error" onClick={handleDisconnectGmail}>
            Disconnect
          </Button>
        }
      />

      <ConfirmDialog
        open={openResetSync}
        onClose={() => setOpenResetSync(false)}
        title="Reset Email Sync"
        content="This will reset the sync marker and re-scan all Interac emails from the last 60 days on the next sync. Use this if emails weren't imported correctly. After clicking Reset, use 'Sync Now' to scan."
        action={
          <Button variant="contained" color="warning" onClick={handleResetSync} disabled={resetting}>
            {resetting ? 'Resetting...' : 'Reset Sync'}
          </Button>
        }
      />
    </>
  );
}
