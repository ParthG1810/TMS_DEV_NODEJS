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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
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
  auto_matched_customer_id?: number;
  auto_matched_customer_name?: string;
  confirmed_customer_id?: number;
  confirmed_customer_name?: string;
}

interface CustomerCredit {
  id: number;
  original_amount: number;
  current_balance: number;
  created_at: string;
}

interface CreditSummary {
  total_available: number;
  credits: CustomerCredit[];
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
  const { transactionId, creditId, customerId: queryCustomerId } = router.query;

  // Determine mode: 'payment' (transactionId) or 'credit-only' (creditId + customerId)
  const isCreditOnlyMode = !transactionId && (creditId || queryCustomerId);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, number>>(new Map());
  const [creditAllocations, setCreditAllocations] = useState<Map<number, number>>(new Map());
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalCreditApplied, setTotalCreditApplied] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [customerCredit, setCustomerCredit] = useState<CreditSummary | null>(null);
  const [customerName, setCustomerName] = useState<string>('');

  const fetchData = useCallback(async () => {
    // Credit-only mode: creditId or customerId present, no transactionId
    if (isCreditOnlyMode) {
      const custId = queryCustomerId as string;
      if (!custId) {
        enqueueSnackbar('Customer ID is required', { variant: 'error' });
        router.push(PATH_DASHBOARD.payments.credit);
        return;
      }

      try {
        setLoading(true);

        // Fetch customer credit
        const creditResponse = await axios.get(`/api/customers/${custId}/credit`);
        if (!creditResponse.data.success || creditResponse.data.data.total_available <= 0) {
          enqueueSnackbar('No available credit for this customer', { variant: 'warning' });
          router.push(PATH_DASHBOARD.payments.credit);
          return;
        }
        setCustomerCredit(creditResponse.data.data);

        // Fetch unpaid invoices for the customer
        const invoicesResponse = await axios.get('/api/monthly-billing', {
          params: {
            customer_id: custId,
            status: 'unpaid,partial_paid',
            limit: 100,
          },
        });

        if (invoicesResponse.data.success) {
          const unpaidInvoices = invoicesResponse.data.data.invoices || [];
          setInvoices(unpaidInvoices);

          // Get customer name from first invoice
          if (unpaidInvoices.length > 0) {
            setCustomerName(unpaidInvoices[0].customer_name);
          } else {
            // Fetch customer details if no invoices
            try {
              const customerResponse = await axios.get(`/api/customers/${custId}`);
              if (customerResponse.data.success) {
                setCustomerName(customerResponse.data.data.name);
              }
            } catch {
              // Ignore customer fetch error
            }
          }
        }
      } catch (error: any) {
        console.error('Error fetching credit data:', error);
        enqueueSnackbar('Failed to load data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Payment mode: transactionId present
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

        // Check for name mismatch between matched customer and invoice customer
        const matchedCustomerName = tx.confirmed_customer_name || tx.auto_matched_customer_name;
        if (selected_invoices.length > 0 && matchedCustomerName) {
          const invoiceCustomerName = selected_invoices[0].customer_name;
          // Normalize names for comparison (case-insensitive, trim whitespace)
          const normalizedMatched = matchedCustomerName.toLowerCase().trim();
          const normalizedInvoice = invoiceCustomerName?.toLowerCase().trim();

          if (normalizedInvoice && normalizedMatched !== normalizedInvoice) {
            // Name mismatch - redirect back to payment page
            enqueueSnackbar(
              `Customer name mismatch: "${matchedCustomerName}" does not match invoice customer "${invoiceCustomerName}". Please verify the customer selection.`,
              { variant: 'error', autoHideDuration: 6000 }
            );
            router.push(PATH_DASHBOARD.payments.interac);
            return;
          }
        }
      }

      // Fetch customer credit
      try {
        const creditResponse = await axios.get(`/api/customers/${customerId}/credit`);
        if (creditResponse.data.success) {
          setCustomerCredit(creditResponse.data.data);
        }
      } catch (creditError) {
        console.log('No credit available or error fetching credit');
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      enqueueSnackbar('Failed to load data', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [transactionId, isCreditOnlyMode, queryCustomerId, enqueueSnackbar, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAllocationChange = (invoiceId: number, value: string) => {
    const newAllocations = new Map(selectedInvoices);

    // Handle empty input - remove allocation
    if (value === '') {
      newAllocations.delete(invoiceId);
      let total = 0;
      newAllocations.forEach(val => { total += val; });
      setSelectedInvoices(newAllocations);
      setTotalAllocated(total);
      setRemainingAmount(transaction ? transaction.amount - total : 0);
      return;
    }

    const amount = parseFloat(value);
    if (isNaN(amount)) return;

    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    // Limit to balance due (allow 0)
    const maxAmount = Math.max(0, Math.min(amount, invoice.balance_due));
    newAllocations.set(invoiceId, maxAmount);

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

  const handleCreditAllocationChange = (invoiceId: number, value: string) => {
    const newCreditAllocations = new Map(creditAllocations);

    // Handle empty input - remove credit allocation
    if (value === '') {
      newCreditAllocations.delete(invoiceId);
      let totalCredit = 0;
      newCreditAllocations.forEach(val => { totalCredit += val; });
      setCreditAllocations(newCreditAllocations);
      setTotalCreditApplied(totalCredit);
      return;
    }

    const amount = parseFloat(value);
    if (isNaN(amount)) return;

    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;

    // Get payment allocation for this invoice (only in payment mode)
    const paymentAllocation = isCreditOnlyMode ? 0 : (selectedInvoices.get(invoiceId) || 0);
    // Credit can only fill the remaining balance after payment allocation
    const remainingBalanceAfterPayment = Math.max(0, invoice.balance_due - paymentAllocation);

    // Calculate how much credit is already allocated to other invoices
    let otherCreditAllocated = 0;
    creditAllocations.forEach((val, id) => {
      if (id !== invoiceId) otherCreditAllocated += val;
    });

    const availableCredit = (customerCredit?.total_available || 0) - otherCreditAllocated;
    const maxCreditForInvoice = Math.max(0, Math.min(amount, remainingBalanceAfterPayment, availableCredit));
    newCreditAllocations.set(invoiceId, maxCreditForInvoice);

    // Calculate total credit applied
    let totalCredit = 0;
    newCreditAllocations.forEach(val => { totalCredit += val; });

    setCreditAllocations(newCreditAllocations);
    setTotalCreditApplied(totalCredit);
  };

  const getRemainingCredit = () => {
    return (customerCredit?.total_available || 0) - totalCreditApplied;
  };

  const handleSubmit = async () => {
    // Credit-only mode: apply credit to invoices
    if (isCreditOnlyMode) {
      if (creditAllocations.size === 0) {
        enqueueSnackbar('Please allocate credit to at least one invoice', { variant: 'warning' });
        return;
      }

      const custId = queryCustomerId as string;
      if (!custId) {
        enqueueSnackbar('Customer ID is required', { variant: 'error' });
        return;
      }

      try {
        setSubmitting(true);

        // Build allocations array for credit-only API
        const allocations: { invoice_id: number; amount: number }[] = [];
        creditAllocations.forEach((amount, invoiceId) => {
          if (amount > 0) {
            allocations.push({ invoice_id: invoiceId, amount });
          }
        });

        const response = await axios.post('/api/customer-credit/apply', {
          customer_id: parseInt(custId, 10),
          allocations,
        });

        if (response.data.success) {
          const { total_applied, allocations: appliedAllocations } = response.data.data;
          enqueueSnackbar(
            `Successfully applied ${fCurrency(total_applied)} credit to ${appliedAllocations.length} invoice(s)`,
            { variant: 'success' }
          );
          router.push(PATH_DASHBOARD.payments.credit);
        } else {
          throw new Error(response.data.error);
        }
      } catch (error: any) {
        console.error('Error applying credit:', error);
        enqueueSnackbar(error.response?.data?.error || error.message || 'Failed to apply credit', { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Payment mode: allocate payment to invoices
    if (!transaction || selectedInvoices.size === 0) return;

    const customerId = transaction.confirmed_customer_id || transaction.auto_matched_customer_id;
    if (!customerId) {
      enqueueSnackbar('No customer matched. Please select a customer first.', { variant: 'error' });
      return;
    }

    try {
      setSubmitting(true);

      // Create payment record
      const paymentResponse = await axios.post('/api/payment-records', {
        payment_type: 'online',
        payment_source: 'interac',
        interac_transaction_id: transaction.id,
        customer_id: customerId,
        amount: transaction.amount,
        payment_date: transaction.email_date,
        reference_number: transaction.reference_number,
        notes: `Interac e-Transfer from ${transaction.sender_name}`,
      });

      if (!paymentResponse.data.success) {
        throw new Error(paymentResponse.data.error);
      }

      const paymentId = paymentResponse.data.data.id;

      // Allocate to invoices - send custom allocation amounts with per-invoice credit
      const allocations: { invoice_id: number; amount: number; credit_amount?: number }[] = [];
      selectedInvoices.forEach((amount, invoiceId) => {
        const creditAmount = creditAllocations.get(invoiceId) || 0;
        allocations.push({
          invoice_id: invoiceId,
          amount,
          credit_amount: creditAmount > 0 ? creditAmount : undefined,
        });
      });

      // Also include invoices that only have credit (no payment allocation)
      creditAllocations.forEach((creditAmount, invoiceId) => {
        if (!selectedInvoices.has(invoiceId) && creditAmount > 0) {
          allocations.push({
            invoice_id: invoiceId,
            amount: 0,
            credit_amount: creditAmount,
          });
        }
      });

      const allocateResponse = await axios.post(`/api/payment-records/${paymentId}/allocate`, {
        allocations,
      });

      if (allocateResponse.data.success) {
        const { allocation_status, excess_amount, credit_applied } = allocateResponse.data.data;

        let successMsg = 'Payment allocated successfully';
        if (credit_applied > 0) {
          successMsg += `. ${fCurrency(credit_applied)} credit applied.`;
        }
        if (allocation_status === 'has_excess' && excess_amount > 0) {
          successMsg += ` ${fCurrency(excess_amount)} added to customer credit.`;
        }
        enqueueSnackbar(successMsg, { variant: 'success' });

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

  if (!isCreditOnlyMode && !transaction) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Typography>Transaction not found</Typography>
      </Container>
    );
  }

  if (isCreditOnlyMode && !customerCredit) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Typography>No credit available</Typography>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>{isCreditOnlyMode ? 'Apply Credit' : 'Allocate Payment'} | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading={isCreditOnlyMode ? 'Apply Credit to Invoices' : 'Allocate Payment'}
          links={
            isCreditOnlyMode
              ? [
                  { name: 'Dashboard', href: PATH_DASHBOARD.root },
                  { name: 'Payments', href: PATH_DASHBOARD.payments.root },
                  { name: 'Customer Credit', href: PATH_DASHBOARD.payments.credit },
                  { name: 'Apply Credit' },
                ]
              : [
                  { name: 'Dashboard', href: PATH_DASHBOARD.root },
                  { name: 'Payments', href: PATH_DASHBOARD.payments.root },
                  { name: 'Interac Transactions', href: PATH_DASHBOARD.payments.interac },
                  { name: 'Allocate' },
                ]
          }
        />

        <Grid container spacing={3}>
          {/* Sidebar - Credit Details or Payment Details */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, position: 'sticky', top: 80 }}>
              {isCreditOnlyMode ? (
                <>
                  <Typography variant="h6" gutterBottom>
                    Credit Details
                  </Typography>
                  <Divider sx={{ mb: 2 }} />

                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Customer
                      </Typography>
                      <Typography variant="body1">
                        {customerName || 'Loading...'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Available Credit
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {fCurrency(customerCredit?.total_available || 0)}
                      </Typography>
                    </Box>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Credit to Apply:</Typography>
                      <Typography variant="subtitle2" color="primary.main">
                        {fCurrency(totalCreditApplied)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Remaining Credit:</Typography>
                      <Typography variant="subtitle2" color="text.secondary">
                        {fCurrency(getRemainingCredit())}
                      </Typography>
                    </Stack>

                    <Button
                      variant="contained"
                      size="large"
                      fullWidth
                      onClick={handleSubmit}
                      disabled={submitting || creditAllocations.size === 0}
                      startIcon={submitting ? <CircularProgress size={20} /> : <Iconify icon="eva:checkmark-circle-2-fill" />}
                    >
                      {submitting ? 'Processing...' : 'Apply Credit'}
                    </Button>

                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => router.push(PATH_DASHBOARD.payments.credit)}
                    >
                      Cancel
                    </Button>
                  </Stack>
                </>
              ) : (
                <>
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
                        {transaction?.confirmed_customer_name || transaction?.auto_matched_customer_name}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Amount
                      </Typography>
                      <Typography variant="h4" color="success.main">
                        {fCurrency(transaction?.amount || 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Reference
                      </Typography>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {transaction?.reference_number}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Date
                      </Typography>
                      <Typography variant="body2">
                        {transaction?.email_date ? fDate(transaction.email_date) : '-'}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Sender
                      </Typography>
                      <Typography variant="body2">{transaction?.sender_name}</Typography>
                    </Box>

                    <Divider />

                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Total Allocated:</Typography>
                      <Typography variant="subtitle2">{fCurrency(totalAllocated)}</Typography>
                    </Stack>
                    {totalCreditApplied > 0 && (
                      <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2">Credit Applied:</Typography>
                        <Typography variant="subtitle2" color="success.main">
                          {fCurrency(totalCreditApplied)}
                        </Typography>
                      </Stack>
                    )}
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
                </>
              )}
            </Card>
          </Grid>

          {/* Invoice Selection */}
          <Grid item xs={12} md={8}>
            {/* Customer Credit Card - only show in payment mode, not credit-only mode */}
            {!isCreditOnlyMode && customerCredit && customerCredit.total_available > 0 && (
              <Card sx={{ p: 3, mb: 3, bgcolor: 'success.lighter' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Iconify icon="eva:credit-card-fill" sx={{ color: 'success.main' }} width={24} />
                      <Typography variant="h6">Customer Credit Available</Typography>
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      Use the "Credit" column below to apply credit to specific invoices
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box textAlign="right">
                      <Typography variant="caption" color="text.secondary">
                        Total Available
                      </Typography>
                      <Typography variant="h5" color="success.main">
                        {fCurrency(customerCredit.total_available)}
                      </Typography>
                    </Box>
                    {totalCreditApplied > 0 && (
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">
                          Remaining
                        </Typography>
                        <Typography variant="h5" color="warning.main">
                          {fCurrency(getRemainingCredit())}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </Stack>
                {totalCreditApplied > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    {fCurrency(totalCreditApplied)} credit will be applied to selected invoices
                  </Alert>
                )}
              </Card>
            )}

            <Card sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                {isCreditOnlyMode ? 'Select Invoices for Credit' : 'Select Invoices to Pay'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {isCreditOnlyMode
                  ? 'Enter credit amounts to apply to each invoice below.'
                  : 'The oldest unpaid invoices are auto-selected. You can modify allocations below.'}
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
                          {!isCreditOnlyMode && <TableCell padding="checkbox" />}
                          <TableCell>Invoice Period</TableCell>
                          <TableCell align="right">Total</TableCell>
                          <TableCell align="right">Paid</TableCell>
                          <TableCell align="right">Balance Due</TableCell>
                          {!isCreditOnlyMode && <TableCell align="right">Allocate</TableCell>}
                          {(isCreditOnlyMode || (customerCredit && customerCredit.total_available > 0)) && (
                            <TableCell align="right">Credit</TableCell>
                          )}
                          <TableCell align="right">After</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {invoices.map((invoice) => {
                          const isSelected = selectedInvoices.has(invoice.id);
                          const allocatedAmount = selectedInvoices.get(invoice.id) || 0;
                          const creditAmount = creditAllocations.get(invoice.id) || 0;
                          const afterPayment = invoice.balance_due - allocatedAmount - creditAmount;
                          // In credit-only mode, max credit is the invoice balance; in payment mode, it's balance minus payment
                          const maxCreditAmount = isCreditOnlyMode
                            ? invoice.balance_due
                            : Math.max(0, invoice.balance_due - allocatedAmount);

                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              sx={{ '&:last-child td': { borderBottom: 0 } }}
                            >
                              {!isCreditOnlyMode && (
                                <TableCell padding="checkbox">
                                  <Checkbox
                                    checked={isSelected || creditAmount > 0}
                                    onChange={() => handleToggleInvoice(invoice)}
                                  />
                                </TableCell>
                              )}
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
                              {!isCreditOnlyMode && (
                                <TableCell align="right" sx={{ width: 100 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={selectedInvoices.has(invoice.id) ? allocatedAmount : ''}
                                    onChange={(e) => handleAllocationChange(invoice.id, e.target.value)}
                                    inputProps={{
                                      min: 0,
                                      max: invoice.balance_due,
                                      step: 0.01,
                                    }}
                                    sx={{ width: 90 }}
                                  />
                                </TableCell>
                              )}
                              {(isCreditOnlyMode || (customerCredit && customerCredit.total_available > 0)) && (
                                <TableCell align="right" sx={{ width: 100 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={creditAllocations.has(invoice.id) ? creditAmount : ''}
                                    onChange={(e) => handleCreditAllocationChange(invoice.id, e.target.value)}
                                    inputProps={{
                                      min: 0,
                                      max: maxCreditAmount,
                                      step: 0.01,
                                    }}
                                    sx={{ width: 90 }}
                                    disabled={maxCreditAmount <= 0}
                                  />
                                </TableCell>
                              )}
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
