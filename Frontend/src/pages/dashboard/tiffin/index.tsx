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
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import Label from '../../../components/label';
import { fDate } from '../../../utils/formatTime';

// ----------------------------------------------------------------------

interface DashboardStats {
  activeCustomers: number;
  activeOrders: number;
  pendingBillings: number;
  unpaidInvoices: number;
  todayDeliveries: number;
  totalMealPlans: number;
  recentOrders: any[];
  recentCustomers: any[];
}

// ----------------------------------------------------------------------

TiffinDashboardPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function TiffinDashboardPage() {
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    activeCustomers: 0,
    activeOrders: 0,
    pendingBillings: 0,
    unpaidInvoices: 0,
    todayDeliveries: 0,
    totalMealPlans: 0,
    recentOrders: [],
    recentCustomers: [],
  });

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [customersRes, ordersRes, billingsRes, invoicesRes, mealPlansRes, dailyCountRes] = await Promise.all([
        axios.get('/api/tiffin/customers'),
        axios.get('/api/tiffin/orders'),
        axios.get('/api/billing'),
        axios.get('/api/tiffin/invoices'),
        axios.get('/api/tiffin/meal-plans'),
        axios.get('/api/tiffin/daily-count', { params: { date: new Date().toISOString().split('T')[0] } }),
      ]);

      const customers = customersRes.data.success ? customersRes.data.data : [];
      const orders = ordersRes.data.success ? ordersRes.data.data : [];
      const billings = billingsRes.data.success ? billingsRes.data.data : [];
      const invoices = invoicesRes.data.success ? invoicesRes.data.data : [];
      const mealPlans = mealPlansRes.data.success ? mealPlansRes.data.data : [];
      const dailyCount = dailyCountRes.data.success ? dailyCountRes.data.data : [];

      // Calculate stats
      const activeCustomers = customers.filter((c: any) => c.status === 'active').length;
      const activeOrders = orders.filter((o: any) => o.status === 'active').length;
      const pendingBillings = billings.filter((b: any) => b.payment_status === 'pending').length;
      const unpaidInvoices = invoices.filter((i: any) => i.payment_status === 'unpaid' || i.payment_status === 'partial').length;
      const todayDeliveries = dailyCount.reduce((sum: number, item: any) => sum + (item.total_tiffins || 0), 0);

      // Get recent orders (last 5)
      const recentOrders = orders
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      // Get recent customers (last 5)
      const recentCustomers = customers
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

      setStats({
        activeCustomers,
        activeOrders,
        pendingBillings,
        unpaidInvoices,
        todayDeliveries,
        totalMealPlans: mealPlans.length,
        recentOrders,
        recentCustomers,
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
        <title>Tiffin Dashboard | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Tiffin Management"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin' },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                component={NextLink}
                href={PATH_DASHBOARD.tiffin.orderNew}
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" />}
              >
                New Order
              </Button>
            </Stack>
          }
        />

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
                  startIcon={<Iconify icon="eva:people-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.customers}
                >
                  Customers
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.25,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {stats.activeCustomers}
                  </Box>
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="eva:shopping-bag-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.orders}
                >
                  Tiffin Orders
                  <Box
                    component="span"
                    sx={{
                      ml: 1,
                      px: 1,
                      py: 0.25,
                      bgcolor: 'success.main',
                      color: 'success.contrastText',
                      borderRadius: 1,
                      fontSize: '0.75rem',
                    }}
                  >
                    {stats.activeOrders}
                  </Box>
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="eva:calendar-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.billingCalendar}
                >
                  Billing Calendar
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="eva:file-text-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.billingStatus}
                >
                  Billing Status
                  {stats.pendingBillings > 0 && (
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
                      {stats.pendingBillings}
                    </Box>
                  )}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="primary"
                  startIcon={<Iconify icon="eva:file-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.invoices}
                >
                  Invoices
                  {stats.unpaidInvoices > 0 && (
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
                      {stats.unpaidInvoices}
                    </Box>
                  )}
                </Button>
                <Divider />
                <Button
                  fullWidth
                  variant="soft"
                  startIcon={<Iconify icon="eva:grid-fill" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.mealPlans}
                >
                  Meal Plans
                </Button>
                <Button
                  fullWidth
                  variant="soft"
                  startIcon={<Iconify icon="eva:settings-2-outline" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.settings}
                >
                  Settings
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Stats Cards */}
          <Grid item xs={12} md={8}>
            <Grid container spacing={3}>
              {/* Active Customers */}
              <Grid item xs={12} sm={6}>
                <Card sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'primary.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="eva:people-fill" width={32} color="primary.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.activeCustomers}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Customers
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Active Orders */}
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
                      <Iconify icon="eva:shopping-bag-fill" width={32} color="success.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.activeOrders}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Orders
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Pending Billings */}
              <Grid item xs={12} sm={6}>
                <Card
                  sx={{
                    p: 3,
                    bgcolor: stats.pendingBillings > 0
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
                      <Iconify icon="eva:clock-fill" width={32} color="warning.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.pendingBillings}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Billings
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Unpaid Invoices */}
              <Grid item xs={12} sm={6}>
                <Card
                  sx={{
                    p: 3,
                    bgcolor: stats.unpaidInvoices > 0
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
                      <Iconify icon="eva:alert-circle-fill" width={32} color="error.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.unpaidInvoices}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Unpaid Invoices
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Today's Deliveries */}
              <Grid item xs={12} sm={6}>
                <Card sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'info.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="mdi:truck-delivery" width={32} color="info.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.todayDeliveries}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Today's Deliveries
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>

              {/* Total Meal Plans */}
              <Grid item xs={12} sm={6}>
                <Card sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: 'secondary.lighter',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Iconify icon="eva:grid-fill" width={32} color="secondary.main" />
                    </Box>
                    <Box>
                      <Typography variant="h4">{stats.totalMealPlans}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Meal Plans
                      </Typography>
                    </Box>
                  </Stack>
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Recent Orders */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Orders</Typography>
                <Button
                  size="small"
                  endIcon={<Iconify icon="eva:arrow-forward-outline" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.orders}
                >
                  View All
                </Button>
              </Stack>

              {stats.recentOrders.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No orders yet
                </Typography>
              ) : (
                <List disablePadding>
                  {stats.recentOrders.map((order, index) => (
                    <ListItem
                      key={order.id}
                      divider={index < stats.recentOrders.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: order.status === 'active' ? 'success.lighter' : 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify
                            icon="eva:shopping-bag-fill"
                            color={order.status === 'active' ? 'success.main' : 'grey.500'}
                          />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={order.customer_name}
                        secondary={`${order.meal_plan_name} - ${order.tiffin_quantity} tiffins`}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Label
                        color={order.status === 'active' ? 'success' : order.status === 'paused' ? 'warning' : 'error'}
                      >
                        {order.status}
                      </Label>
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>
          </Grid>

          {/* Recent Customers */}
          <Grid item xs={12} md={6}>
            <Card sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                <Typography variant="h6">Recent Customers</Typography>
                <Button
                  size="small"
                  endIcon={<Iconify icon="eva:arrow-forward-outline" />}
                  component={NextLink}
                  href={PATH_DASHBOARD.tiffin.customers}
                >
                  View All
                </Button>
              </Stack>

              {stats.recentCustomers.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  No customers yet
                </Typography>
              ) : (
                <List disablePadding>
                  {stats.recentCustomers.map((customer, index) => (
                    <ListItem
                      key={customer.id}
                      divider={index < stats.recentCustomers.length - 1}
                      sx={{ px: 0 }}
                    >
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: 1,
                            bgcolor: customer.status === 'active' ? 'primary.lighter' : 'grey.200',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Iconify
                            icon="eva:person-fill"
                            color={customer.status === 'active' ? 'primary.main' : 'grey.500'}
                          />
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={customer.name}
                        secondary={customer.phone || customer.email || 'No contact info'}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                      <Label
                        color={customer.status === 'active' ? 'success' : 'default'}
                      >
                        {customer.status}
                      </Label>
                    </ListItem>
                  ))}
                </List>
              )}
            </Card>
          </Grid>

          {/* Daily Reports Links */}
          <Grid item xs={12}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Daily Reports
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<Iconify icon="mdi:counter" />}
                    component={NextLink}
                    href={PATH_DASHBOARD.tiffin.dailyCount}
                    sx={{ py: 2 }}
                  >
                    Daily Count
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<Iconify icon="eva:calendar-fill" />}
                    component={NextLink}
                    href={PATH_DASHBOARD.tiffin.monthlyList}
                    sx={{ py: 2 }}
                  >
                    Monthly List
                  </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="large"
                    startIcon={<Iconify icon="eva:list-fill" />}
                    component={NextLink}
                    href={PATH_DASHBOARD.tiffin.completeList}
                    sx={{ py: 2 }}
                  >
                    Complete List
                  </Button>
                </Grid>
              </Grid>
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
