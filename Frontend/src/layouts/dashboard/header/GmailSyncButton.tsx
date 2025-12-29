import { useState, useEffect, useCallback } from 'react';
// @mui
import { Button, CircularProgress, Tooltip } from '@mui/material';
// utils
import axios from '../../../utils/axios';
// components
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';

// ----------------------------------------------------------------------

interface GmailStatus {
  connected: boolean;
  email?: string;
  lastSyncAt?: string;
  syncEnabled?: boolean;
}

// ----------------------------------------------------------------------

export default function GmailSyncButton() {
  const { enqueueSnackbar } = useSnackbar();

  const [syncing, setSyncing] = useState(false);
  const [gmailStatus, setGmailStatus] = useState<GmailStatus>({ connected: false });

  const fetchGmailStatus = useCallback(async () => {
    try {
      const response = await axios.get('/api/gmail/status');
      if (response.data.success) {
        setGmailStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching Gmail status:', error);
    }
  }, []);

  useEffect(() => {
    fetchGmailStatus();
  }, [fetchGmailStatus]);

  const handleManualSync = async () => {
    try {
      setSyncing(true);
      const response = await axios.post('/api/gmail/sync');
      if (response.data.success) {
        const { message, totalNewTransactions } = response.data.data;
        enqueueSnackbar(
          message || 'Sync complete',
          { variant: totalNewTransactions > 0 ? 'success' : 'info' }
        );
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

  // Only show button if Gmail is connected
  if (!gmailStatus.connected) {
    return null;
  }

  return (
    <Tooltip title="Sync Gmail for new e-Transfer emails">
      <Button
        variant="contained"
        color="primary"
        size="small"
        startIcon={
          syncing ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <Iconify icon="eva:sync-outline" />
          )
        }
        onClick={handleManualSync}
        disabled={syncing}
        sx={{ minWidth: 'auto', px: 1.5 }}
      >
        {syncing ? 'Syncing...' : 'Sync Now'}
      </Button>
    </Tooltip>
  );
}
