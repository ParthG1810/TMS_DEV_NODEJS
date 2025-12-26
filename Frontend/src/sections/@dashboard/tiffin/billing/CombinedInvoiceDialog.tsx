import { useState, useEffect } from 'react';
// @mui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
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
  IconButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';
// utils
import axios from '../../../../utils/axios';

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
  status: 'calculating' | 'finalized';
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
    all_finalized: boolean;
    grand_total_delivered: number;
    grand_total_absent: number;
    grand_total_extra: number;
    grand_total_amount: number;
  };
  can_approve: boolean;
}

interface CombinedInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  customerName: string;
  billingMonth: string;
  onApproved?: () => void;
}

export default function CombinedInvoiceDialog({
  open,
  onClose,
  customerId,
  customerName,
  billingMonth,
  onApproved,
}: CombinedInvoiceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<CombinedInvoice | null>(null);
  const [approving, setApproving] = useState(false);

  // Fetch combined invoice data
  useEffect(() => {
    if (open && customerId && billingMonth) {
      fetchInvoice();
    }
  }, [open, customerId, billingMonth]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/order-billing/combined-invoice', {
        params: {
          customer_id: customerId,
          billing_month: billingMonth,
        },
      });

      if (response.data.success) {
        setInvoice(response.data.data);
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
      // Update monthly_billing status to 'paid' or 'finalized'
      // First, create or update the monthly_billing record
      const response = await axios.post('/api/monthly-billing', {
        customer_id: customerId,
        billing_month: billingMonth,
      });

      if (response.data.success && response.data.data?.id) {
        // Update the status to finalized
        await axios.put(`/api/monthly-billing/${response.data.data.id}`, {
          status: 'finalized',
        });

        enqueueSnackbar('Combined invoice approved successfully!', { variant: 'success' });
        onApproved?.();
        onClose();
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

  const formatDate = (date: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `CAD $${amount.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'finalized':
        return 'success';
      default:
        return 'default';
    }
  };

  // Parse billing month for display
  const getMonthDisplay = () => {
    if (!billingMonth) return '';
    const [year, month] = billingMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography variant="h5">Combined Invoice</Typography>
            <Typography variant="body2" color="text.secondary">
              {customerName} - {getMonthDisplay()}
            </Typography>
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : invoice ? (
          <Stack spacing={3}>
            {/* Customer Info */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Stack direction="row" spacing={4}>
                <Stack>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="subtitle1">{invoice.customer_name}</Typography>
                </Stack>
                {invoice.customer_phone && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body2">{invoice.customer_phone}</Typography>
                  </Stack>
                )}
                {invoice.customer_address && (
                  <Stack>
                    <Typography variant="caption" color="text.secondary">
                      Address
                    </Typography>
                    <Typography variant="body2">{invoice.customer_address}</Typography>
                  </Stack>
                )}
              </Stack>
            </Paper>

            {/* Orders Progress */}
            <Alert
              severity={invoice.can_approve ? 'success' : 'warning'}
              icon={
                invoice.can_approve ? (
                  <Iconify icon="eva:checkmark-circle-2-fill" />
                ) : (
                  <Iconify icon="eva:alert-triangle-fill" />
                )
              }
            >
              {invoice.can_approve
                ? 'All orders are finalized. You can approve this combined invoice.'
                : `${invoice.summary.finalized_orders} of ${invoice.summary.total_orders} orders finalized. Please finalize all orders before approving.`}
            </Alert>

            {/* Orders Table */}
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <StyledHeaderCell>Meal Plan</StyledHeaderCell>
                    <StyledHeaderCell align="center">Period</StyledHeaderCell>
                    <StyledHeaderCell align="center">Plan Days</StyledHeaderCell>
                    <StyledHeaderCell align="center">Delivered</StyledHeaderCell>
                    <StyledHeaderCell align="center">Absent</StyledHeaderCell>
                    <StyledHeaderCell align="center">Extra</StyledHeaderCell>
                    <StyledHeaderCell align="right">Amount</StyledHeaderCell>
                    <StyledHeaderCell align="center">Status</StyledHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {invoice.orders.map((order, index) => (
                    <TableRow key={order.order_id || index} hover>
                      <StyledTableCell>
                        <Stack>
                          <Typography variant="body2" fontWeight={600}>
                            {order.meal_plan_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Plan: {formatCurrency(order.order_price)}
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
                          <Typography fontWeight={700}>{formatCurrency(order.total_amount)}</Typography>
                          {order.extra_amount > 0 && (
                            <Typography variant="caption" color="text.secondary">
                              (Base: {formatCurrency(order.base_amount)} + Extra: {formatCurrency(order.extra_amount)})
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
                    </TableRow>
                  ))}

                  {/* Summary Row */}
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <StyledTableCell colSpan={3}>
                      <Typography fontWeight={700}>GRAND TOTAL</Typography>
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      <Typography fontWeight={700} color="success.main">
                        {invoice.summary.grand_total_delivered}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      <Typography fontWeight={700} color="error.main">
                        {invoice.summary.grand_total_absent}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell align="center">
                      <Typography fontWeight={700} color="info.main">
                        {invoice.summary.grand_total_extra}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell align="right">
                      <Typography variant="h6" color="primary.main">
                        {formatCurrency(invoice.summary.grand_total_amount)}
                      </Typography>
                    </StyledTableCell>
                    <StyledTableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* Selected Days Info */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Order Details
              </Typography>
              <Stack spacing={1}>
                {invoice.orders.map((order, index) => (
                  <Stack key={order.order_id || index} direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600} sx={{ minWidth: 150 }}>
                      {order.meal_plan_name}:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.selected_days && order.selected_days.length > 0
                        ? order.selected_days.join(', ')
                        : 'All days'}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          </Stack>
        ) : (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">No invoice data found</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {invoice && (
          <Button
            variant="contained"
            color="primary"
            onClick={handleApprove}
            disabled={!invoice.can_approve || approving}
            startIcon={
              approving ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="eva:checkmark-circle-2-fill" />
              )
            }
          >
            {approving ? 'Approving...' : 'Approve Invoice'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
