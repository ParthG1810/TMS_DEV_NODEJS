import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  Checkbox,
  TextField,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  TableContainer,
  Paper,
  Chip,
} from '@mui/material';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate } from '../../../utils/formatTime';

// ----------------------------------------------------------------------

interface Invoice {
  id: number;
  billing_month: string;
  total_amount: number;
  amount_paid: number;
  credit_applied: number;
  balance_due: number;
  status: string;
  customer_name: string;
  selection_order?: number;
  will_allocate?: number;
  balance_after?: number;
  will_be_paid?: boolean;
}

interface Transaction {
  id: number;
  email_date: string;
  sender_name: string;
  reference_number: string;
  amount: number;
  confirmed_customer_id: number;
  confirmed_customer_name: string;
}

interface AllocationItem {
  invoiceId: number;
  amount: number;
  order: number;
}

// ----------------------------------------------------------------------

PaymentAllocationPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function PaymentAllocationPage() {
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const { transactionId } = router.query;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, number>>(new Map());
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!transactionId) return;

    try {
      setLoading(true);

      // Fetch transaction details
      const txResponse = await axios.get(`/api/interac-transactions/${transactionId}`);
      if (!txResponse.data.success) {
        enqueueSnackbar('Transaction not found', { variant: 'error' });
        router.push(PATH_DASHBOARD.payments.interac);
        return;
      }

      const tx = txResponse.data.data;
      setTransaction(tx);

      const customerId = tx.confirmed_customer_id || tx.auto_matched_customer_id;
      if (!customerId) {
        enqueueSnackbar('No customer matched. Please select a customer first.', { variant: 'warning' });
        router.push(PATH_DASHBOARD.payments.interac);
        return;
      }

      // Auto-select invoices
      const autoSelectResponse = await axios.get('/api/monthly-billing/auto-select', {
        params: {
          customer_id: customerId,
          payment_amount: tx.amount,
        },
      });

      if (autoSelectResponse.data.success) {
        const { selected_invoices, remaining_amount } = autoSelectResponse.data.data;
        setInvoices(selected_invoices);

        // Set initial allocations
        const initialAllocations = new Map<number, number>();
        let total = 0;
        selected_invoices.forEach((inv: Invoice) => {
          if (inv.will_allocate && inv.will_allocate > 0) {
            initialAllocations.set(inv.id, inv.will_allocate);
            total += inv.will_allocate;
          }
        });
        setSelectedInvoices(initialAllocations);
        setTotalAllocated(total);
        setRemainingAmount(remaining_amount);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      enqueueSnackbar('Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [transactionId, enqueueSnackbar, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAllocationChange = (invoiceId: number, value: string) => {
    const amount = parseFloat(value) || 0;
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    // Limit to balance due
    const maxAmount = Math.min(amount, invoice.balance_due);

    const newAllocations = new Map(selectedInvoices);
    if (maxAmount > 0) {
      newAllocations.set(invoiceId, maxAmount);
    } else {
      newAllocations.delete(invoiceId);
    }

    // Calculate total
    let total = 0;
    newAllocations.forEach(val => { total += val; });

    // Limit total to payment amount
    if (transaction && total > transaction.amount) {
      return;
    }

    setSelectedInvoices(newAllocations);
    setTotalAllocated(total);
    setRemainingAmount(transaction ? transaction.amount - total : 0);
  };

  const handleToggleInvoice = (invoice: Invoice) => {
    const newAllocations = new Map(selectedInvoices);

    if (newAllocations.has(invoice.id)) {
      newAllocations.delete(invoice.id);
    } else {
      const available = transaction ? transaction.amount - totalAllocated : 0;
      const toAllocate = Math.min(invoice.balance_due, available);
      if (toAllocate > 0) {
        newAllocations.set(invoice.id, toAllocate);
      }
    }

    let total = 0;
    newAllocations.forEach(val => { total += val; });
    setSelectedInvoices(newAllocations);
    setTotalAllocated(total);
    setRemainingAmount(transaction ? transaction.amount - total : 0);
  };

  const handleSubmit = async () => {
    if (!transaction || selectedInvoices.size === 0) return;

    try {
      setSubmitting(true);

      // Create payment record
      const paymentResponse = await axios.post('/api/payment-records', {
        payment_type: 'online',
        payment_source: 'interac',
        interac_transaction_id: transaction.id,
        customer_id: transaction.confirmed_customer_id,
        amount: transaction.amount,
        payment_date: transaction.email_date,
        reference_number: transaction.reference_number,
        notes: `Interac e-Transfer from ${transaction.sender_name}`,
      });

      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.error);
      }

      const paymentId = paymentResponse.data.data.id;

      // Allocate to invoices
      const allocations: AllocationItem[] = [];
      let order = 1;
      selectedInvoices.forEach((amount, invoiceId) => {
        allocations.push({ invoiceId, amount, order });
        order++;
      });

      const allocateResponse = await axios.post(`/api/payment-records/${paymentId}/allocate`, {
        allocations,
      });

      if (allocateResponse.data.success) {
        const { has_excess, excess_amount } = allocateResponse.data.data;

        if (has_excess) {
          enqueueSnackbar(
            `Payment allocated. ${fCurrency(excess_amount)} added to customer credit.`,
            { variant: 'success' }
          );
        } else {
          enqueueSnackbar('Payment allocated successfully', { variant: 'success' });
        }

        router.push(PATH_DASHBOARD.payments.history);
      } else {
        throw new Error(allocateResponse.data.error);
      }
    } catch (error: any) {
      console.error('Error allocating payment:', error);
      enqueueSnackbar(error.message || 'Failed to allocate payment', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
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

  if (!transaction) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Typography>Transaction not found</Typography>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>Allocate Payment | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Allocate Payment"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Interac Transactions', href: PATH_DASHBOARD.payments.interac },
            { name: 'Allocate' },
          ]}
        />

        <Grid container spacing={3}>
          {/* Payment Details */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Customer
                  </Typography>
                  <Typography variant="body1">
                    {transaction.confirmed_customer_name}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {fCurrency(transaction.amount)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Reference
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                    {transaction.reference_number}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body2">
                    {fDate(transaction.email_date)}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Sender
                  </Typography>
                  <Typography variant="body2">{transaction.sender_name}</Typography>
                </Box>

                <Divider />

                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Total Allocated:</Typography>
                  <Typography variant="subtitle2">{fCurrency(totalAllocated)}</Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="body2">Remaining:</Typography>
                  <Typography variant="subtitle2" color={remainingAmount > 0 ? 'warning.main' : 'text.secondary'}>
                    {fCurrency(remainingAmount)}
                  </Typography>
                </Stack>

                {remainingAmount > 0 && (
                  <Alert severity="info" sx={{ mt: 1 }}>
                    {fCurrency(remainingAmount)} will be added as customer credit
                  </Alert>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={submitting || selectedInvoices.size === 0}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Iconify icon="eva:checkmark-circle-2-fill" />}
                >
                  {submitting ? 'Processing...' : 'Confirm Allocation'}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push(PATH_DASHBOARD.payments.interac)}
                >
                  Cancel
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Invoice Selection */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Select Invoices to Pay
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                The 3 oldest unpaid invoices are auto-selected. You can modify allocations below.
              </Typography>

              {invoices.length === 0 ? (
                <Alert severity="info">
                  No unpaid invoices found for this customer.
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Scrollbar>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell padding="checkbox" />
                          <TableCell>Invoice Period</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Paid</TableCell>
                          <TableCell align="right">Balance Due</TableCell>
                          <TableCell align="right">Allocate</TableCell>
                          <TableCell align="right">After</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((invoice) => {
                          const isSelected = selectedInvoices.has(invoice.id);
                          const allocatedAmount = selectedInvoices.get(invoice.id) || 0;
                          const afterPayment = invoice.balance_due - allocatedAmount;

                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              sx={{ '&:last-child td': { borderBottom: 0 } }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => handleToggleInvoice(invoice)}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {fDate(invoice.billing_month, 'MMMM yyyy')}
                                </Typography>
                                {invoice.status === 'partial_paid' && (
                                  <Chip size="small" label="Partially Paid" color="warning" variant="soft" />
                                )}
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2">
                                  {fCurrency(invoice.total_amount)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="body2" color="success.main">
                                  {fCurrency(invoice.amount_paid + invoice.credit_applied)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right">
                                <Typography variant="subtitle2" color="error.main">
                                  {fCurrency(invoice.balance_due)}
                                </Typography>
                              </TableCell>
                              <TableCell align="right" sx={{ width: 120 }}>
                                <TextField
                                  size="small"
                                  type="number"
                                  value={allocatedAmount || ''}
                                  onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                                  inputProps={{
                                    min: 0,
                                    max: invoice.balance_due,
                                    step: 0.01,
                                  }}
                                  sx={{ width: 100 }}
                                />
                              </TableCell>
                              <TableCell align="right">
                                <Typography
                                  variant="body2"
                                  color={afterPayment <= 0 ? 'success.main' : 'text.secondary'}
                                >
                                  {fCurrency(Math.max(0, afterPayment))}
                                  {afterPayment <= 0 && (
                                    <Iconify
                                      icon="eva:checkmark-circle-2-fill"
                                      sx={{ ml: 0.5, color: 'success.main', verticalAlign: 'middle' }}
                                      width={16}
                                    />
                                  )}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}
