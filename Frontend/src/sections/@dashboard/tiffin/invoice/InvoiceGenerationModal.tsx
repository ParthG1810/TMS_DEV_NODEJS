import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Checkbox,
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
  TextField,
  Divider,
  Stack,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import Iconify from '../../../../components/iconify';
import { fCurrency } from '../../../../utils/formatNumber';
import axios from '../../../../utils/axios';
import { useSnackbar } from '../../../../components/snackbar';

// ----------------------------------------------------------------------

interface AvailableOrder {
  id: number;
  order_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_amount: number;
  status: string;
  finalized_at: string | null;
  meal_plan_name: string;
  order_price: number;
}

interface InvoicedOrder extends AvailableOrder {
  invoice_id: number;
  invoice_number: string;
}

interface NotReadyOrder {
  id: number;
  order_id: number;
  meal_plan_name: string;
  billing_month: string;
  total_amount: number;
  status: string;
}

interface AvailableForInvoiceData {
  customer: {
    id: number;
    name: string;
    phone: string;
    address: string;
  };
  billing_month: string;
  available_orders: AvailableOrder[];
  already_invoiced_orders: InvoicedOrder[];
  not_ready_orders: NotReadyOrder[];
  summary: {
    total_orders: number;
    available_for_invoice: number;
    already_invoiced: number;
    not_ready: number;
    available_total_amount: number;
  };
}

interface InvoiceGenerationModalProps {
  open: boolean;
  onClose: () => void;
  customerId: number;
  billingMonth: string;
  onSuccess?: (invoice: any) => void;
}

// ----------------------------------------------------------------------

export default function InvoiceGenerationModal({
  open,
  onClose,
  customerId,
  billingMonth,
  onSuccess,
}: InvoiceGenerationModalProps) {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState<AvailableForInvoiceData | null>(null);
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Fetch available orders when modal opens
  useEffect(() => {
    if (open && customerId && billingMonth) {
      fetchAvailableOrders();
    }
  }, [open, customerId, billingMonth]);

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/order-billing/available-for-invoice', {
        params: {
          customer_id: customerId,
          billing_month: billingMonth,
        },
      });

      if (response.data.success) {
        setData(response.data.data);
        // Pre-select all available orders
        setSelectedOrderIds(response.data.data.available_orders.map((o: AvailableOrder) => o.id));
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load available orders', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching available orders:', error);
      enqueueSnackbar(error.message || 'Failed to load available orders', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (orderId: number) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleToggleAll = () => {
    if (!data) return;
    if (selectedOrderIds.length === data.available_orders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(data.available_orders.map((o) => o.id));
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
        if (onSuccess) {
          onSuccess(response.data.data);
        }
        onClose();
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

  const selectedTotal = data
    ? data.available_orders
        .filter((o) => selectedOrderIds.includes(o.id))
        .reduce((sum, o) => sum + o.total_amount, 0)
    : 0;

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Iconify icon="solar:document-add-bold" width={24} />
          <Typography variant="h6">Generate Invoice</Typography>
        </Stack>
        {data && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {data.customer.name} - {formatMonth(billingMonth)}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : !data ? (
          <Alert severity="error">Failed to load data</Alert>
        ) : (
          <Box>
            {/* Available Orders Section */}
            {data.available_orders.length > 0 ? (
              <>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  Select Orders to Include in Invoice
                </Typography>
                <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedOrderIds.length === data.available_orders.length}
                            indeterminate={
                              selectedOrderIds.length > 0 &&
                              selectedOrderIds.length < data.available_orders.length
                            }
                            onChange={handleToggleAll}
                          />
                        </TableCell>
                        <TableCell>Order / Meal Plan</TableCell>
                        <TableCell align="center">Delivered</TableCell>
                        <TableCell align="center">Absent</TableCell>
                        <TableCell align="center">Extra</TableCell>
                        <TableCell align="right">Amount</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {data.available_orders.map((order) => (
                        <TableRow
                          key={order.id}
                          hover
                          onClick={() => handleToggleOrder(order.id)}
                          sx={{ cursor: 'pointer' }}
                        >
                          <TableCell padding="checkbox">
                            <Checkbox checked={selectedOrderIds.includes(order.id)} />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {order.meal_plan_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              Order #{order.order_id}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={order.total_delivered}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.success.main, 0.1),
                                color: theme.palette.success.dark,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={order.total_absent}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                color: theme.palette.error.dark,
                              }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={order.total_extra}
                              size="small"
                              sx={{
                                bgcolor: alpha(theme.palette.info.main, 0.1),
                                color: theme.palette.info.dark,
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight="bold">
                              {fCurrency(order.total_amount)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            ) : (
              <Alert severity="info" sx={{ mb: 2 }}>
                No orders available for invoice generation. Orders must be finalized first.
              </Alert>
            )}

            {/* Already Invoiced Orders */}
            {data.already_invoiced_orders.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Already Invoiced ({data.already_invoiced_orders.length})
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 1, bgcolor: alpha(theme.palette.warning.main, 0.05) }}
                >
                  {data.already_invoiced_orders.map((order) => (
                    <Box
                      key={order.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                      }}
                    >
                      <Typography variant="body2">
                        {order.meal_plan_name} - {fCurrency(order.total_amount)}
                      </Typography>
                      <Chip
                        label={order.invoice_number}
                        size="small"
                        color="warning"
                        variant="outlined"
                      />
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            {/* Not Ready Orders */}
            {data.not_ready_orders.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Not Ready ({data.not_ready_orders.length})
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{ p: 1, bgcolor: alpha(theme.palette.grey[500], 0.05) }}
                >
                  {data.not_ready_orders.map((order, index) => (
                    <Box
                      key={`${order.order_id}-${index}`}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        {order.meal_plan_name}
                      </Typography>
                      <Chip
                        label={order.status === 'no_billing' ? 'No Billing' : 'Calculating'}
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                    </Box>
                  ))}
                </Paper>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {/* Invoice Options */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
              <DatePicker
                label="Due Date (Optional)"
                value={dueDate}
                onChange={(newValue) => setDueDate(newValue)}
                renderInput={(params) => <TextField {...params} size="small" fullWidth />}
              />
              <TextField
                label="Notes (Optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                fullWidth
                multiline
                rows={1}
              />
            </Stack>

            {/* Summary */}
            <Paper
              sx={{
                p: 2,
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
                  <Typography variant="body2" color="text.secondary">
                    Selected Orders: {selectedOrderIds.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Invoice Type:{' '}
                    {selectedOrderIds.length === 1 ? 'Individual' : 'Combined'}
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="caption" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h5" color="primary.main" fontWeight="bold">
                    {fCurrency(selectedTotal)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerateInvoice}
          disabled={loading || generating || selectedOrderIds.length === 0}
          startIcon={
            generating ? (
              <CircularProgress size={16} color="inherit" />
            ) : (
              <Iconify icon="solar:document-add-bold" />
            )
          }
        >
          {generating ? 'Generating...' : 'Generate Invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
