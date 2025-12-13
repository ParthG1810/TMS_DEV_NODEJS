import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import NextLink from 'next/link';
import {
  Container,
  Grid,
  Card,
  Stack,
  Typography,
  Button,
  Box,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Alert,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate } from '../../../utils/formatTime';

// ----------------------------------------------------------------------

interface DashboardStats {
  pendingTransactions: number;
  pendingRefunds: number;
  totalCredit: number;
  recentPayments: any[];
  gmailConnected: boolean;
  lastSync: string | null;
}

// ----------------------------------------------------------------------

PaymentsDashboardPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function PaymentsDashboardPage() {
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    pendingTransactions: 0,
    pendingRefunds: 0,
    totalCredit: 0,
    recentPayments: [],
    gmailConnected: false,
    lastSync: null,
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [transactionsRes, refundsRes, creditsRes, paymentsRes, gmailRes] = await Promise.all([
        axios.get('/api/interac-transactions', { params: { status: 'pending' } }),
        axios.get('/api/refunds', { params: { status: 'pending' } }),
        axios.get('/api/customer-credit', { params: { status: 'available' } }),
        axios.get('/api/payment-records', { params: { limit: 5 } }),
        axios.get('/api/gmail/status'),
      ]);

      setStats({
        pendingTransactions: transactionsRes.data.success ? transactionsRes.data.data.length : 0,
        pendingRefunds: refundsRes.data.success ? refundsRes.data.data.length : 0,
        totalCredit: creditsRes.data.success
          ? creditsRes.data.data.reduce((sum: number, c: any) => sum + c.current_balance, 0)
          : 0,
        recentPayments: paymentsRes.data.success ? paymentsRes.data.data.slice(0, 5) : [],
        gmailConnected: gmailRes.data.success ? gmailRes.data.data.connected : false,
        lastSync: gmailRes.data.success ? gmailRes.data.data.lastSyncAt : null,
      });
    } catch (error: any) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
        <title>Payments Dashboard | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Payments"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments' },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                component={NextLink}
                href={PATH_DASHBOARD.payments.cashPayment}
                variant="contained"
                startIcon={<Iconify icon="mdi:cash-plus" />}
              >
                Record Cash Payment
              </Button>
            </Stack>
          }
        />

        {/* Gmail Status Alert */}
        {!stats.gmailConnected && (
          <Alert
            severity="warning"
            sx={{ mb: 3 }}
            action={
              <Button
                color="warning"
                size="small"
                component={NextLink}
                href={PATH_DASHBOARD.payments.settings}
              >
                Connect Now
              </Button>
            }
          >
            Gmail is not connected. Connect your Gmail to automatically import Interac e-Transfer payments.
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Quick Actions */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Quick Actions
              </Typography>
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="mdi:email-sync" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.interac}
                >
                  Interac Transactions
                  {stats.pendingTransactions > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 1,
                        py: 0.25,
                        bgcolor: 'warning.main',
                        color: 'warning.contrastText',
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {stats.pendingTransactions}
                    </Box>
                  )}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="mdi:history" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.history}
                >
                  Payment History
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="mdi:credit-card-multiple" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.credit}
                >
                  Customer Credit
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="mdi:cash-refund" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.refunds}
                >
                  Refunds
                  {stats.pendingRefunds > 0 && (
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        px: 1,
                        py: 0.25,
                        bgcolor: 'error.main',
                        color: 'error.contrastText',
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {stats.pendingRefunds}
                    </Box>
                  )}
                </Button>
                <Divider />
                <Button
                  fullWidth
                  variant="soft"
                  startIcon={<Iconify icon="eva:settings-2-outline" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.settings}
                >
                  Gmail Settings
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {/* Pending Transactions */}
              <Grid item xs={12} sm={6}>
                <Card
                  sx={{
                    p: 3,
                    bgcolor: stats.pendingTransactions > 0
                      ? alpha(theme.palette.warning.main, 0.1)
                      : 'background.paper',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'warning.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="mdi:email-alert" width={32} color="warning.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.pendingTransactions}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Transactions
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Pending Refunds */}
              <Grid item xs={12} sm={6}>
                <Card
                  sx={{
                    p: 3,
                    bgcolor: stats.pendingRefunds > 0
                      ? alpha(theme.palette.error.main, 0.1)
                      : 'background.paper',
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'error.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="mdi:cash-refund" width={32} color="error.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.pendingRefunds}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Refunds
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Total Customer Credit */}
              <Grid item xs={12} sm={6}>
                <Card sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'success.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="mdi:wallet-plus" width={32} color="success.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4" color="success.main">
                        {fCurrency(stats.totalCredit)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Customer Credit
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Gmail Status */}
              <Grid item xs={12} sm={6}>
                <Card sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: stats.gmailConnected ? 'success.lighter' : 'grey.200',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify
                        icon="mdi:gmail"
                        width={32}
                        color={stats.gmailConnected ? 'success.main' : 'grey.500'}
                      />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1">
                        {stats.gmailConnected ? 'Connected' : 'Not Connected'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {stats.lastSync ? `Last sync: ${fDate(stats.lastSync)}` : 'No sync yet'}
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Recent Payments */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Payments</Typography>
                <Button
                  size="small"
                  endIcon={<Iconify icon="eva:arrow-forward-outline" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.payments.history}
                >
                  View All
                </Button>
              </Stack>

              {stats.recentPayments.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No payments recorded yet
                </Typography>
              ) : (
                <List disablePadding>
                  {stats.recentPayments.map((payment, index) => (
                    <ListItem
                      key={payment.id}
                      divider={index < stats.recentPayments.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: payment.payment_type === 'online' ? 'primary.lighter' : 'success.lighter',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify
                            icon={payment.payment_type === 'online' ? 'mdi:credit-card' : 'mdi:cash'}
                            color={payment.payment_type === 'online' ? 'primary.main' : 'success.main'}
                          />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={payment.customer_name}
                        secondary={fDate(payment.payment_date)}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Typography variant="subtitle2" color="success.main">
                        {fCurrency(payment.amount)}
                      </Typography>
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
