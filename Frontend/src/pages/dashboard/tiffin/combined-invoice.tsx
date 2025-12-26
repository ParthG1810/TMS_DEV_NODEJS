import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import {
  Container,
  Card,
  Box,
  Typography,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Checkbox,
  TextField,
  Grid,
} from '@mui/material';
import { styled, useTheme, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// components
import { useSettingsContext } from '../../../components/settings';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Iconify from '../../../components/iconify';
import { useSnackbar } from '../../../components/snackbar';
// utils
import axios from '../../../utils/axios';
import { fCurrency } from '../../../utils/formatNumber';

// ----------------------------------------------------------------------

CombinedInvoicePage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 1.5),
  fontSize: 13,
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1, 1.5),
  fontWeight: 'bold',
  fontSize: 13,
  backgroundColor: theme.palette.grey[100],
}));

// ----------------------------------------------------------------------

interface OrderBillingDetail {
  id: number;
  order_id: number;
  customer_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  status: 'calculating' | 'finalized' | 'approved' | 'invoiced' | 'paid' | 'partial_paid';
  finalized_at: string | null;
  finalized_by: string | null;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
  selected_days: string[];
}

interface CombinedInvoice {
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  billing_month: string;
  orders: OrderBillingDetail[];
  summary: {
    total_orders: number;
    finalized_orders: number;
    selectable_orders: number;
    invoiced_orders: number;
    all_finalized: boolean;
    all_invoiced: boolean;
    grand_total_delivered: number;
    grand_total_absent: number;
    grand_total_extra: number;
    grand_total_amount: number;
  };
  can_approve: boolean;
  all_invoiced: boolean;
}

// ----------------------------------------------------------------------

export default function CombinedInvoicePage() {
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const { customerId, month, customerName } = router.query;

  const [loading, setLoading] = useState(true);
  const [invoice, setInvoice] = useState<CombinedInvoice | null>(null);
  const [approving, setApproving] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch combined invoice data
  useEffect(() => {
    if (customerId && month) {
      fetchInvoice();
    }
  }, [customerId, month]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/order-billing/combined-invoice', {
        params: {
          customer_id: customerId,
          billing_month: month,
        },
      });

      if (response.data.success) {
        setInvoice(response.data.data);
        // Pre-select all finalized/approved orders
        const selectableOrders = response.data.data.orders.filter(
          (o: OrderBillingDetail) => o.status === 'finalized' || o.status === 'approved'
        );
        setSelectedOrderIds(selectableOrders.map((o: OrderBillingDetail) => o.id));
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoice', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching combined invoice:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to load invoice', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!invoice) return;

    setApproving(true);
    try {
      const response = await axios.post('/api/monthly-billing', {
        customer_id: customerId,
        billing_month: month,
      });

      if (response.data.success && response.data.data?.id) {
        await axios.put(`/api/monthly-billing/${response.data.data.id}`, {
          status: 'finalized',
        });

        enqueueSnackbar('Combined invoice approved successfully!', { variant: 'success' });
        fetchInvoice();
      } else {
        enqueueSnackbar('Failed to approve invoice', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error approving invoice:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to approve invoice', { variant: 'error' });
    } finally {
      setApproving(false);
    }
  };

  const handleToggleOrder = (orderId: number) => {
    const order = invoice?.orders.find((o) => o.id === orderId);
    if (!order || (order.status !== 'finalized' && order.status !== 'approved')) {
      return; // Can only select finalized/approved orders
    }
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleAll = () => {
    if (!invoice) return;
    const selectableOrders = invoice.orders.filter(
      (o) => o.status === 'finalized' || o.status === 'approved'
    );
    if (selectedOrderIds.length === selectableOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(selectableOrders.map((o) => o.id));
    }
  };

  const handleGenerateInvoice = async () => {
    if (selectedOrderIds.length === 0) {
      enqueueSnackbar('Please select at least one order', { variant: 'warning' });
      return;
    }

    try {
      setGenerating(true);
      const response = await axios.post('/api/invoices/generate', {
        customer_id: customerId,
        order_billing_ids: selectedOrderIds,
        due_date: dueDate ? dueDate.toISOString().split('T')[0] : null,
        notes: notes || null,
      });

      if (response.data.success) {
        enqueueSnackbar(
          `Invoice ${response.data.data.invoice_number} generated successfully!`,
          { variant: 'success' }
        );
        // Trigger notification refresh to remove billing pending approval notifications
        window.dispatchEvent(new CustomEvent('refresh-notifications'));
        router.push('/dashboard/tiffin/invoices');
      } else {
        enqueueSnackbar(response.data.error || 'Failed to generate invoice', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      enqueueSnackbar(error.message || 'Failed to generate invoice', { variant: 'error' });
    } finally {
      setGenerating(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/tiffin/billing-calendar');
  };

  const handleViewOrderInvoice = (order: OrderBillingDetail) => {
    router.push({
      pathname: '/dashboard/tiffin/order-invoice-details',
      query: {
        orderId: order.order_id,
        month: order.billing_month,
      },
    });
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  const getStatusColor = (status: string): 'default' | 'warning' | 'success' | 'info' | 'primary' => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'finalized':
        return 'success';
      case 'approved':
        return 'info';
      case 'invoiced':
        return 'primary';
      default:
        return 'default';
    }
  };

  const isOrderSelectable = (order: OrderBillingDetail) => {
    return order.status === 'finalized' || order.status === 'approved';
  };

  const getMonthDisplay = () => {
    if (!month || typeof month !== 'string') return '';
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Calculate selected total
  const selectedTotal = invoice
    ? invoice.orders
        .filter((o) => selectedOrderIds.includes(o.id))
        .reduce((sum, o) => sum + o.total_amount, 0)
    : 0;

  const selectableOrdersCount = invoice
    ? invoice.orders.filter((o) => o.status === 'finalized' || o.status === 'approved').length
    : 0;

  return (
    <>
      <Head>
        <title>Combined Invoice | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Combined Invoice"
          links={[
            { name: 'Dashboard', href: '/dashboard' },
            { name: 'Tiffin', href: '/dashboard/tiffin' },
            { name: 'Billing Calendar', href: '/dashboard/tiffin/billing-calendar' },
            { name: 'Combined Invoice' },
          ]}
          action={
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-back-fill" />}
              onClick={handleBack}
            >
              Back to Calendar
            </Button>
          }
        />

        {loading ? (
          <Card sx={{ p: 5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          </Card>
        ) : !invoice ? (
          <Card sx={{ p: 5 }}>
            <Alert severity="error">Failed to load invoice data</Alert>
          </Card>
        ) : (
          <Stack spacing={3}>
            {/* Header Card */}
            <Card sx={{ p: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack>
                  <Typography variant="h4">{invoice.customer_name}</Typography>
                  <Typography variant="body1" color="text.secondary">
                    {getMonthDisplay()}
                  </Typography>
                </Stack>
                <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }}>
                  <Typography variant="caption" color="text.secondary">
                    Selected Total
                  </Typography>
                  <Typography variant="h3" color="primary.main">
                    {fCurrency(selectedTotal)}
                  </Typography>
                </Stack>
              </Stack>
            </Card>

            {/* Customer Info */}
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Customer Information
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={4}>
                <Stack>
                  <Typography variant="caption" color="text.secondary">
                    Customer Name
                  </Typography>
                  <Typography variant="subtitle1">{invoice.customer_name}</Typography>
                </Stack>
                {invoice.customer_phone && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1">{invoice.customer_phone}</Typography>
                  </Stack>
                )}
                {invoice.customer_address && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body1">{invoice.customer_address}</Typography>
                  </Stack>
                )}
              </Stack>
            </Card>

            {/* Orders Progress */}
            <Alert
              severity={invoice.all_invoiced ? 'info' : invoice.can_approve ? 'success' : 'warning'}
              icon={
                invoice.all_invoiced ? (
                  <Iconify icon="eva:checkmark-circle-2-fill" />
                ) : invoice.can_approve ? (
                  <Iconify icon="eva:checkmark-circle-2-fill" />
                ) : (
                  <Iconify icon="eva:alert-triangle-fill" />
                )
              }
            >
              {invoice.all_invoiced
                ? 'All orders have already been invoiced. View the invoices in the Invoices section.'
                : invoice.can_approve
                ? `${invoice.summary.selectable_orders} order(s) ready for invoicing. Select orders below to generate a combined invoice.`
                : `${invoice.summary.finalized_orders} of ${invoice.summary.total_orders} orders ready. Please finalize all orders before generating invoice.`}
            </Alert>

            {/* Orders Table with Selection */}
            <Card>
              <Box sx={{ p: 3, pb: 2 }}>
                <Typography variant="h6">
                  Select Orders to Include in Invoice
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedOrderIds.length} of {selectableOrdersCount} available orders selected
                </Typography>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <StyledHeaderCell padding="checkbox">
                        <Checkbox
                          checked={selectedOrderIds.length === selectableOrdersCount && selectableOrdersCount > 0}
                          indeterminate={
                            selectedOrderIds.length > 0 &&
                            selectedOrderIds.length < selectableOrdersCount
                          }
                          onChange={handleToggleAll}
                          disabled={selectableOrdersCount === 0}
                        />
                      </StyledHeaderCell>
                      <StyledHeaderCell>Meal Plan</StyledHeaderCell>
                      <StyledHeaderCell align="center">Period</StyledHeaderCell>
                      <StyledHeaderCell align="center">Plan Days</StyledHeaderCell>
                      <StyledHeaderCell align="center">Delivered</StyledHeaderCell>
                      <StyledHeaderCell align="center">Absent</StyledHeaderCell>
                      <StyledHeaderCell align="center">Extra</StyledHeaderCell>
                      <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                      <StyledHeaderCell align="center">Status</StyledHeaderCell>
                      <StyledHeaderCell align="center">Actions</StyledHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.orders.map((order, index) => {
                      const selectable = isOrderSelectable(order);
                      return (
                        <TableRow
                          key={order.order_id || index}
                          hover
                          onClick={() => selectable && handleToggleOrder(order.id)}
                          sx={{
                            cursor: selectable ? 'pointer' : 'default',
                            opacity: selectable ? 1 : 0.6,
                          }}
                        >
                          <StyledTableCell padding="checkbox">
                            <Checkbox
                              checked={selectedOrderIds.includes(order.id)}
                              disabled={!selectable}
                            />
                          </StyledTableCell>
                          <StyledTableCell>
                            <Stack>
                              <Typography variant="body2" fontWeight={600}>
                                {order.meal_plan_name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                Plan: {fCurrency(order.order_price)}
                              </Typography>
                            </Stack>
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            <Typography variant="caption">
                              {formatDate(order.start_date)} - {formatDate(order.end_date)}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell align="center">{order.total_plan_days}</StyledTableCell>
                          <StyledTableCell align="center">
                            <Typography color="success.main" fontWeight={600}>
                              {order.total_delivered}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            <Typography color="error.main" fontWeight={600}>
                              {order.total_absent}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            <Typography color="info.main" fontWeight={600}>
                              {order.total_extra}
                            </Typography>
                          </StyledTableCell>
                          <StyledTableCell align="right">
                            <Stack alignItems="flex-end">
                              <Typography fontWeight={700}>{fCurrency(order.total_amount)}</Typography>
                              {order.extra_amount > 0 && (
                                <Typography variant="caption" color="text.secondary">
                                  (Base: {fCurrency(order.base_amount)} + Extra: {fCurrency(order.extra_amount)})
                                </Typography>
                              )}
                            </Stack>
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            <Chip
                              label={order.status}
                              color={getStatusColor(order.status)}
                              size="small"
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </StyledTableCell>
                          <StyledTableCell align="center">
                            <Button
                              size="small"
                              variant="text"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewOrderInvoice(order);
                              }}
                              startIcon={<Iconify icon="eva:file-text-outline" width={16} />}
                            >
                              View
                            </Button>
                          </StyledTableCell>
                        </TableRow>
                      );
                    })}

                    {/* Summary Row */}
                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                      <StyledTableCell />
                      <StyledTableCell colSpan={3}>
                        <Typography fontWeight={700}>SELECTED TOTAL</Typography>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <Typography fontWeight={700} color="success.main">
                          {invoice.orders
                            .filter((o) => selectedOrderIds.includes(o.id))
                            .reduce((sum, o) => sum + o.total_delivered, 0)}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <Typography fontWeight={700} color="error.main">
                          {invoice.orders
                            .filter((o) => selectedOrderIds.includes(o.id))
                            .reduce((sum, o) => sum + o.total_absent, 0)}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell align="center">
                        <Typography fontWeight={700} color="info.main">
                          {invoice.orders
                            .filter((o) => selectedOrderIds.includes(o.id))
                            .reduce((sum, o) => sum + o.total_extra, 0)}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell align="right">
                        <Typography variant="h6" color="primary.main">
                          {fCurrency(selectedTotal)}
                        </Typography>
                      </StyledTableCell>
                      <StyledTableCell colSpan={2} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>

            {/* Invoice Options */}
            {selectedOrderIds.length > 0 && (
              <Card sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Invoice Options
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <DatePicker
                      label="Due Date (Optional)"
                      value={dueDate}
                      onChange={(newValue) => setDueDate(newValue)}
                      renderInput={(params) => <TextField {...params} fullWidth />}
                    />
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <TextField
                      label="Notes (Optional)"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      fullWidth
                      multiline
                      rows={2}
                    />
                  </Grid>
                </Grid>
              </Card>
            )}

            {/* Generate Invoice Button */}
            <Card sx={{ p: 3 }}>
              <Stack
                direction={{ xs: 'column', md: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', md: 'center' }}
                spacing={3}
              >
                <Paper
                  sx={{
                    p: 3,
                    flex: 1,
                    bgcolor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography variant="body1" color="text.secondary">
                        Selected Orders: {selectedOrderIds.length}
                      </Typography>
                      <Typography variant="body1" color="text.secondary">
                        Invoice Type:{' '}
                        <strong>{selectedOrderIds.length === 1 ? 'Individual' : 'Combined'}</strong>
                      </Typography>
                    </Box>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Total Amount
                      </Typography>
                      <Typography variant="h4" color="primary.main" fontWeight="bold">
                        {fCurrency(selectedTotal)}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="outlined"
                    size="large"
                    onClick={handleBack}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGenerateInvoice}
                    disabled={loading || generating || selectedOrderIds.length === 0}
                    startIcon={
                      generating ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Iconify icon="solar:document-add-bold" />
                      )
                    }
                  >
                    {generating ? 'Generating...' : 'Generate Combined Invoice'}
                  </Button>
                </Stack>
              </Stack>
            </Card>

            {/* Summary Stats */}
            <Card sx={{ p: 3 }}>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={3}
                divider={<Divider orientation="vertical" flexItem />}
              >
                <Stack flex={1} alignItems="center">
                  <Typography variant="h4" color="success.main">
                    {invoice.summary.grand_total_delivered}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Delivered
                  </Typography>
                </Stack>
                <Stack flex={1} alignItems="center">
                  <Typography variant="h4" color="error.main">
                    {invoice.summary.grand_total_absent}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Absent
                  </Typography>
                </Stack>
                <Stack flex={1} alignItems="center">
                  <Typography variant="h4" color="info.main">
                    {invoice.summary.grand_total_extra}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Extra
                  </Typography>
                </Stack>
                <Stack flex={1} alignItems="center">
                  <Typography variant="h4" color="primary.main">
                    {fCurrency(invoice.summary.grand_total_amount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Grand Total
                  </Typography>
                </Stack>
              </Stack>
            </Card>
          </Stack>
        )}
      </Container>
    </>
  );
}
