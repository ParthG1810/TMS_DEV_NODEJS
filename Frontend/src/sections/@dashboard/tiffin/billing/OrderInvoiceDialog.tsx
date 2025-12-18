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
  IconButton,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';
// utils
import axios from '../../../../utils/axios';

// ----------------------------------------------------------------------

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(0.75, 1),
  fontSize: 12,
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(0.75, 1),
  fontWeight: 'bold',
  fontSize: 12,
  backgroundColor: theme.palette.grey[100],
}));

const StatusChip = styled(Box)<{ status: string }>(({ theme, status }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 24,
  height: 24,
  borderRadius: '50%',
  fontWeight: 'bold',
  fontSize: 11,
  color: 'white',
  backgroundColor:
    status === 'T'
      ? theme.palette.success.main
      : status === 'A'
      ? theme.palette.error.main
      : status === 'E'
      ? theme.palette.info.main
      : theme.palette.grey[400],
}));

// ----------------------------------------------------------------------

interface CalendarEntry {
  delivery_date: string;
  status: 'T' | 'A' | 'E';
  quantity: number;
  price: number;
}

interface OrderInvoice {
  order_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  billing_month: string;
  meal_plan_name: string;
  meal_plan_price: number;
  start_date: string;
  end_date: string;
  selected_days: string[];
  billing: {
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
  };
  calendar_entries: CalendarEntry[];
}

interface OrderInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  billingMonth: string;
  onViewCombined?: () => void;
}

export default function OrderInvoiceDialog({
  open,
  onClose,
  orderId,
  billingMonth,
  onViewCombined,
}: OrderInvoiceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);

  // Fetch order invoice data
  useEffect(() => {
    if (open && orderId && billingMonth) {
      fetchInvoice();
    }
  }, [open, orderId, billingMonth]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/order-billing/order-invoice', {
        params: {
          order_id: orderId,
          billing_month: billingMonth,
        },
      });

      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoice', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching order invoice:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to load invoice', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatCurrency = (amount: number) => {
    return `CAD $${amount.toFixed(2)}`;
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'T':
        return 'Delivered';
      case 'A':
        return 'Absent';
      case 'E':
        return 'Extra';
      default:
        return status;
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
            <Typography variant="h5">Order Invoice</Typography>
            {invoice && (
              <Typography variant="body2" color="text.secondary">
                {invoice.meal_plan_name} - {getMonthDisplay()}
              </Typography>
            )}
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
            {/* Customer & Order Info */}
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Customer Details
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="body1" fontWeight={600}>
                      {invoice.customer_name}
                    </Typography>
                    {invoice.customer_phone && (
                      <Typography variant="body2" color="text.secondary">
                        {invoice.customer_phone}
                      </Typography>
                    )}
                    {invoice.customer_address && (
                      <Typography variant="body2" color="text.secondary">
                        {invoice.customer_address}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom color="text.secondary">
                    Order Details
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="body1" fontWeight={600}>
                      {invoice.meal_plan_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Price: {formatCurrency(invoice.meal_plan_price)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Period: {formatDate(invoice.start_date)} - {formatDate(invoice.end_date)}
                    </Typography>
                    {invoice.selected_days.length > 0 && (
                      <Typography variant="body2" color="text.secondary">
                        Days: {invoice.selected_days.join(', ')}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* Billing Summary */}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom color="text.secondary">
                Billing Summary
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h4" color="text.secondary">
                      {invoice.billing.total_plan_days}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Plan Days
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h4" color="success.main">
                      {invoice.billing.total_delivered}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Delivered
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h4" color="error.main">
                      {invoice.billing.total_absent}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Absent
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Stack alignItems="center" spacing={0.5}>
                    <Typography variant="h4" color="info.main">
                      {invoice.billing.total_extra}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Extra
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Stack alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Base Amount
                    </Typography>
                    <Typography variant="h6">{formatCurrency(invoice.billing.base_amount)}</Typography>
                  </Stack>
                </Grid>
                <Grid item xs={4}>
                  <Stack alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Extra Amount
                    </Typography>
                    <Typography variant="h6" color="info.main">
                      +{formatCurrency(invoice.billing.extra_amount)}
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={4}>
                  <Stack alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Total Amount
                    </Typography>
                    <Typography variant="h5" color="primary.main" fontWeight={700}>
                      {formatCurrency(invoice.billing.total_amount)}
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                <Chip
                  label={invoice.billing.status === 'finalized' ? 'Finalized' : 'Calculating'}
                  color={invoice.billing.status === 'finalized' ? 'success' : 'warning'}
                  size="small"
                />
                {invoice.billing.finalized_at && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    on {new Date(invoice.billing.finalized_at).toLocaleDateString()}
                  </Typography>
                )}
              </Box>
            </Paper>

            {/* Calendar Entries */}
            <Paper variant="outlined">
              <Box sx={{ p: 2, pb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Calendar Entries ({invoice.calendar_entries.length})
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <StyledHeaderCell>Date</StyledHeaderCell>
                      <StyledHeaderCell align="center">Status</StyledHeaderCell>
                      <StyledHeaderCell align="center">Qty</StyledHeaderCell>
                      <StyledHeaderCell align="right">Price</StyledHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.calendar_entries.length > 0 ? (
                      invoice.calendar_entries.map((entry, index) => (
                        <TableRow key={index} hover>
                          <StyledTableCell>{formatDate(entry.delivery_date)}</StyledTableCell>
                          <StyledTableCell align="center">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                              <StatusChip status={entry.status}>{entry.status}</StatusChip>
                              <Typography variant="caption" color="text.secondary">
                                {getStatusLabel(entry.status)}
                              </Typography>
                            </Stack>
                          </StyledTableCell>
                          <StyledTableCell align="center">{entry.quantity}</StyledTableCell>
                          <StyledTableCell align="right">
                            {entry.status === 'E' ? formatCurrency(entry.price) : '-'}
                          </StyledTableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <StyledTableCell colSpan={4} align="center">
                          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                            No calendar entries found
                          </Typography>
                        </StyledTableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
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
        {onViewCombined && invoice && (
          <Button
            variant="outlined"
            color="primary"
            onClick={onViewCombined}
            startIcon={<Iconify icon="eva:layers-outline" />}
          >
            View Combined Invoice
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
