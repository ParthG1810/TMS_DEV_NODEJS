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
  Autocomplete,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
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

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

interface Invoice {
  id: number;
  billing_month: string;
  total_amount: number;
  amount_paid: number;
  credit_applied: number;
  balance_due: number;
  status: string;
  customer_name: string;
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

CashPaymentPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function CashPaymentPage() {
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<Date | null>(new Date());
  const [notes, setNotes] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Map<number, number>>(new Map());
  const [creditAllocations, setCreditAllocations] = useState<Map<number, number>>(new Map());
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalCreditApplied, setTotalCreditApplied] = useState(0);
  const [customerCredit, setCustomerCredit] = useState<CreditSummary | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      const response = await axios.get('/api/customers');
      if (response.data.success) {
        setCustomers(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const fetchInvoices = useCallback(async () => {
    if (!selectedCustomer || !paymentAmount) {
      setInvoices([]);
      setSelectedInvoices(new Map());
      setCreditAllocations(new Map());
      setTotalCreditApplied(0);
      setCustomerCredit(null);
      return;
    }

    try {
      setLoading(true);
      const response = await axios.get('/api/monthly-billing/auto-select', {
        params: {
          customer_id: selectedCustomer.id,
          payment_amount: parseFloat(paymentAmount),
        },
      });

      if (response.data.success) {
        const { selected_invoices } = response.data.data;
        setInvoices(selected_invoices);

        // Set initial allocations
        const initialAllocations = new Map<number, number>();
        let total = 0;
        selected_invoices.forEach((inv: Invoice & { will_allocate?: number }) => {
          if (inv.will_allocate && inv.will_allocate > 0) {
            initialAllocations.set(inv.id, inv.will_allocate);
            total += inv.will_allocate;
          }
        });
        setSelectedInvoices(initialAllocations);
        setTotalAllocated(total);
      }

      // Fetch customer credit
      try {
        const creditResponse = await axios.get(`/api/customers/${selectedCustomer.id}/credit`);
        if (creditResponse.data.success) {
          setCustomerCredit(creditResponse.data.data);
        }
      } catch (creditError) {
        console.log('No credit available or error fetching credit');
        setCustomerCredit(null);
      }

      // Reset credit allocations
      setCreditAllocations(new Map());
      setTotalCreditApplied(0);
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCustomer, paymentAmount]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchInvoices();
    }, 500); // Debounce
    return () => clearTimeout(timer);
  }, [fetchInvoices]);

  const handleAllocationChange = (invoiceId: number, value: string) => {
    const newAllocations = new Map(selectedInvoices);

    // Handle empty input - remove allocation
    if (value === '') {
      newAllocations.delete(invoiceId);
      let total = 0;
      newAllocations.forEach(val => { total += val; });
      setSelectedInvoices(newAllocations);
      setTotalAllocated(total);
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
    const paymentAmt = parseFloat(paymentAmount) || 0;
    if (total > paymentAmt) {
      return;
    }

    setSelectedInvoices(newAllocations);
    setTotalAllocated(total);
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

    // Get payment allocation for this invoice
    const paymentAllocation = selectedInvoices.get(invoiceId) || 0;
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

  const handleToggleInvoice = (invoice: Invoice) => {
    const newAllocations = new Map(selectedInvoices);

    if (newAllocations.has(invoice.id)) {
      newAllocations.delete(invoice.id);
    } else {
      const paymentAmt = parseFloat(paymentAmount) || 0;
      const available = paymentAmt - totalAllocated;
      const toAllocate = Math.min(invoice.balance_due, available);
      if (toAllocate > 0) {
        newAllocations.set(invoice.id, toAllocate);
      }
    }

    let total = 0;
    newAllocations.forEach(val => { total += val; });
    setSelectedInvoices(newAllocations);
    setTotalAllocated(total);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || !paymentAmount || (selectedInvoices.size === 0 && creditAllocations.size === 0) || !paymentDate) {
      enqueueSnackbar('Please fill all required fields', { variant: 'warning' });
      return;
    }

    try {
      setSubmitting(true);

      // Create payment record
      const paymentResponse = await axios.post('/api/payment-records', {
        payment_type: 'cash',
        customer_id: selectedCustomer.id,
        amount: parseFloat(paymentAmount),
        payment_date: paymentDate.toISOString().split('T')[0],
        notes,
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

        let successMsg = 'Cash payment recorded successfully';
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
      console.error('Error recording payment:', error);
      enqueueSnackbar(error.message || 'Failed to record payment', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const paymentAmt = parseFloat(paymentAmount) || 0;
  const remainingAmount = Math.max(0, paymentAmt - totalAllocated);

  return (
    <>
      <Head>
        <title>Record Cash Payment | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Record Cash Payment"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Cash Payment' },
          ]}
        />

        <Grid container spacing={3}>
          {/* Payment Form */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3, position: 'sticky', top: 80 }}>
              <Typography variant="h6" gutterBottom>
                Payment Details
              </Typography>
              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <Autocomplete
                  fullWidth
                  options={customers}
                  getOptionLabel={(option) => `${option.name}${option.phone ? ` (${option.phone})` : ''}`}
                  value={selectedCustomer}
                  onChange={(_, newValue) => setSelectedCustomer(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Customer *"
                      placeholder="Search customer..."
                    />
                  )}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Stack>
                        <Typography variant="body2">{option.name}</Typography>
                        {option.phone && (
                          <Typography variant="caption" color="text.secondary">
                            {option.phone}
                          </Typography>
                        )}
                      </Stack>
                    </li>
                  )}
                />

                <TextField
                  fullWidth
                  label="Payment Amount *"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  inputProps={{ min: 0, step: 0.01 }}
                  InputProps={{
                    startAdornment: <Typography color="text.secondary">$</Typography>,
                  }}
                />

                <DatePicker
                  label="Payment Date *"
                  value={paymentDate}
                  onChange={(newValue) => setPaymentDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />

                <TextField
                  fullWidth
                  label="Notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  multiline
                  rows={2}
                  placeholder="Optional notes about this payment..."
                />

                <Divider />

                {paymentAmt > 0 && (
                  <>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Payment Amount:</Typography>
                      <Typography variant="subtitle2">{fCurrency(paymentAmt)}</Typography>
                    </Stack>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2">Allocated:</Typography>
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
                      <Typography
                        variant="subtitle2"
                        color={remainingAmount > 0 ? 'warning.main' : 'text.secondary'}
                      >
                        {fCurrency(remainingAmount)}
                      </Typography>
                    </Stack>

                    {remainingAmount > 0 && (
                      <Alert severity="info">
                        {fCurrency(remainingAmount)} will be added as customer credit
                      </Alert>
                    )}
                  </>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleSubmit}
                  disabled={submitting || !selectedCustomer || !paymentAmount || (selectedInvoices.size === 0 && creditAllocations.size === 0)}
                  startIcon={submitting ? <CircularProgress size={20} /> : <Iconify icon="eva:checkmark-circle-2-fill" />}
                >
                  {submitting ? 'Recording...' : 'Record Payment'}
                </Button>

                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => router.push(PATH_DASHBOARD.payments.history)}
                >
                  Cancel
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Invoice Selection */}
          <Grid item xs={12} md={8}>
            {/* Customer Credit Card */}
            {customerCredit && customerCredit.total_available > 0 && (
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
                Allocate to Invoices
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Select a customer and enter payment amount to see available invoices.
              </Typography>

              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress />
                </Box>
              ) : !selectedCustomer ? (
                <Alert severity="info">
                  Please select a customer to view their invoices.
                </Alert>
              ) : !paymentAmount || parseFloat(paymentAmount) <= 0 ? (
                <Alert severity="info">
                  Please enter a payment amount to auto-select invoices.
                </Alert>
              ) : invoices.length === 0 ? (
                <Alert severity="success">
                  This customer has no unpaid invoices. The entire amount will be added as credit.
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
                          {customerCredit && customerCredit.total_available > 0 && (
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
                          const remainingAfterPayment = Math.max(0, invoice.balance_due - allocatedAmount);

                          return (
                            <TableRow
                              key={invoice.id}
                              hover
                              sx={{ '&:last-child td': { borderBottom: 0 } }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  checked={isSelected || creditAmount > 0}
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
                              {customerCredit && customerCredit.total_available > 0 && (
                                <TableCell align="right" sx={{ width: 100 }}>
                                  <TextField
                                    size="small"
                                    type="number"
                                    value={creditAllocations.has(invoice.id) ? creditAmount : ''}
                                    onChange={(e) => handleCreditAllocationChange(invoice.id, e.target.value)}
                                    inputProps={{
                                      min: 0,
                                      max: remainingAfterPayment,
                                      step: 0.01,
                                    }}
                                    sx={{ width: 90 }}
                                    disabled={remainingAfterPayment <= 0}
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
