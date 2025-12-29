import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Container,
  Card,
  Table,
  Stack,
  Button,
  Tooltip,
  Divider,
  TableBody,
  TableContainer,
  TableRow,
  TableCell,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  MenuItem,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import Label from '../../../components/label';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '../../../components/table';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate, fDateTime } from '../../../utils/formatTime';
import { CreditAnalytic, CreditTableToolbar } from '../../../sections/@dashboard/payments/credit/list';

// ----------------------------------------------------------------------

// Helper function for sumBy
function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

// ----------------------------------------------------------------------

interface CustomerCredit {
  id: number;
  customer_id: number;
  customer_name: string;
  payment_record_id: number;
  original_amount: number;
  current_balance: number;
  status: 'available' | 'used' | 'refunded' | 'expired';
  created_at: string;
  payment_date: string;
}

interface SourcePayment {
  id: number;
  payment_date: string;
  amount: number;
  payment_type: string;
  reference_number: string | null;
}

interface CreditUsage {
  id: number;
  billing_id: number;
  invoice_number: string | null;
  billing_month: string;
  amount_used: number;
  used_at: string;
}

interface CreditRefund {
  id: number;
  refund_amount: number;
  refund_method: string;
  refund_date: string;
  reference_number: string | null;
  status: string;
  created_at: string;
}

interface CreditHistory extends CustomerCredit {
  source_payment: SourcePayment | null;
  usage_history: CreditUsage[];
  refund_history: CreditRefund[];
}

const TABLE_HEAD = [
  { id: 'created_at', label: 'Date Created', align: 'left' },
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'original_amount', label: 'Original', align: 'right' },
  { id: 'current_balance', label: 'Balance', align: 'right' },
  { id: 'status', label: 'Status', align: 'center' },
  { id: 'actions', label: '', align: 'right' },
];

const REFUND_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'interac', label: 'Interac e-Transfer' },
  { value: 'cheque', label: 'Cheque' },
];

// ----------------------------------------------------------------------

CustomerCreditPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function CustomerCreditPage() {
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    setPage,
    onChangeDense,
    onChangePage,
    onChangeRowsPerPage,
  } = useTable({ defaultOrderBy: 'created_at', defaultOrder: 'desc' });

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');
  const [openRefund, setOpenRefund] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState('interac');
  const [refundReason, setRefundReason] = useState('');
  const [refundDate, setRefundDate] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);

  // History dialog state
  const [openHistory, setOpenHistory] = useState(false);
  const [creditHistory, setCreditHistory] = useState<CreditHistory | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/customer-credit');
      if (response.data.success) {
        setCredits(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching credits:', error);
      enqueueSnackbar('Failed to fetch customer credits', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return credits.length;
    return credits.filter((credit) => credit.status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(credits, (credit) => Number(credit.current_balance) || 0);
    return sumBy(
      credits.filter((credit) => credit.status === status),
      (credit) => Number(credit.current_balance) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (credits.length === 0) return 0;
    return (getStatusCount(status) / credits.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: credits.length },
    { value: 'available', label: 'Available', color: 'success', count: getStatusCount('available') },
    { value: 'used', label: 'Used', color: 'default', count: getStatusCount('used') },
    { value: 'refunded', label: 'Refunded', color: 'warning', count: getStatusCount('refunded') },
  ] as const;

  const handleFilterStatus = (_event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterStatus(newValue);
  };

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterName(event.target.value);
    setPage(0);
  };

  const handleFilterStartDate = (date: Date | null) => {
    setFilterStartDate(date);
    setPage(0);
  };

  const handleFilterEndDate = (date: Date | null) => {
    setFilterEndDate(date);
    setPage(0);
  };

  const handleFilterAmountOperator = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterAmountOperator(event.target.value);
    setPage(0);
  };

  const handleFilterAmountValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterAmountValue(event.target.value);
    setPage(0);
  };

  const handleResetFilter = () => {
    setFilterStatus('all');
    setFilterStartDate(null);
    setFilterEndDate(null);
    setFilterName('');
    setFilterAmountOperator('');
    setFilterAmountValue('');
  };

  const isFiltered =
    filterStatus !== 'all' ||
    filterStartDate !== null ||
    filterEndDate !== null ||
    filterName !== '' ||
    filterAmountOperator !== '';

  const handleOpenRefund = (credit: CustomerCredit) => {
    setSelectedCredit(credit);
    setRefundAmount(credit.current_balance.toString());
    setRefundMethod('interac');
    setRefundReason('Customer requested refund of excess payment');
    setRefundDate(new Date());
    setOpenRefund(true);
  };

  const handleCloseRefund = () => {
    setOpenRefund(false);
    setSelectedCredit(null);
    setRefundAmount('');
    setRefundReason('');
  };

  const handleSubmitRefund = async () => {
    if (!selectedCredit || !refundAmount || !refundMethod || !refundReason || !refundDate) {
      enqueueSnackbar('Please fill all required fields', { variant: 'warning' });
      return;
    }

    const amount = parseFloat(refundAmount);
    if (amount <= 0 || amount > selectedCredit.current_balance) {
      enqueueSnackbar('Invalid refund amount', { variant: 'error' });
      return;
    }

    try {
      setSubmitting(true);
      const response = await axios.post('/api/refunds', {
        source_type: 'credit',
        credit_id: selectedCredit.id,
        customer_id: selectedCredit.customer_id,
        refund_amount: amount,
        refund_method: refundMethod,
        refund_date: refundDate.toISOString().split('T')[0],
        reason: refundReason,
        requested_by: 1,
      });

      if (response.data.success) {
        enqueueSnackbar('Refund request created successfully', { variant: 'success' });
        handleCloseRefund();
        fetchCredits();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error creating refund:', error);
      enqueueSnackbar(error.message || 'Failed to create refund request', { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenHistory = async (credit: CustomerCredit) => {
    try {
      setLoadingHistory(true);
      setOpenHistory(true);
      const response = await axios.get(`/api/customer-credit/${credit.id}`);
      if (response.data.success) {
        setCreditHistory(response.data.data);
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error fetching credit history:', error);
      enqueueSnackbar('Failed to fetch credit history', { variant: 'error' });
      setOpenHistory(false);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleCloseHistory = () => {
    setOpenHistory(false);
    setCreditHistory(null);
  };

  const getRefundStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <Label color="warning">Pending</Label>;
      case 'completed':
        return <Label color="success">Refunded</Label>;
      case 'cancelled':
        return <Label color="error">Cancelled</Label>;
      default:
        return <Label>{status}</Label>;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return <Label color="success">Available</Label>;
      case 'used':
        return <Label color="info">Used</Label>;
      case 'refunded':
        return <Label color="default">Refunded</Label>;
      case 'expired':
        return <Label color="error">Expired</Label>;
      default:
        return <Label>{status}</Label>;
    }
  };

  // Print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Credit Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
            }
            h1 {
              text-align: center;
              margin-bottom: 20px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #f2f2f2;
              font-weight: bold;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .text-center {
              text-align: center;
            }
            .text-right {
              text-align: right;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>Customer Credit Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date Created</th>
                <th>Customer</th>
                <th class="text-right">Original</th>
                <th class="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredCredits.map((credit) => `
                <tr>
                  <td>${new Date(credit.created_at).toLocaleDateString()}</td>
                  <td>${credit.customer_name}</td>
                  <td class="text-right">$${Number(credit.original_amount).toFixed(2)}</td>
                  <td class="text-right">$${Number(credit.current_balance).toFixed(2)}</td>
                  <td>${credit.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  // Import handler
  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    event.target.value = '';

    if (!file.name.endsWith('.csv')) {
      enqueueSnackbar('Please select a CSV file', { variant: 'error' });
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      const lines = text.split('\n').filter((line) => line.trim());

      if (lines.length < 2) {
        enqueueSnackbar('CSV file is empty', { variant: 'error' });
        setImporting(false);
        return;
      }

      enqueueSnackbar('CSV import for credits is not supported', { variant: 'info' });
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import credits', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  // Export handler
  const handleExport = () => {
    const headers = [
      'ID',
      'Customer ID',
      'Customer Name',
      'Original Amount',
      'Current Balance',
      'Status',
      'Payment Date',
      'Created At',
    ];

    const csvData = filteredCredits.map((credit) => [
      credit.id,
      credit.customer_id,
      `"${credit.customer_name || ''}"`,
      credit.original_amount,
      credit.current_balance,
      credit.status,
      credit.payment_date,
      credit.created_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customer-credits-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Credits exported successfully', { variant: 'success' });
  };

  // Filter credits
  const filteredCredits = credits.filter((credit) => {
    // Status filter
    if (filterStatus !== 'all' && credit.status !== filterStatus) return false;

    // Date range filter
    if (filterStartDate || filterEndDate) {
      const creditDate = new Date(credit.created_at);
      if (filterStartDate && creditDate < filterStartDate) return false;
      if (filterEndDate) {
        const endDatePlusOne = new Date(filterEndDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        if (creditDate >= endDatePlusOne) return false;
      }
    }

    // Search filter
    if (filterName) {
      const query = filterName.toLowerCase();
      const matchesSearch = credit.customer_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Amount filter (on current_balance)
    if (filterAmountOperator && filterAmountValue) {
      const amountValue = parseFloat(filterAmountValue);
      if (!isNaN(amountValue)) {
        const balance = Number(credit.current_balance);
        switch (filterAmountOperator) {
          case '>':
            if (!(balance > amountValue)) return false;
            break;
          case '>=':
            if (!(balance >= amountValue)) return false;
            break;
          case '<':
            if (!(balance < amountValue)) return false;
            break;
          case '<=':
            if (!(balance <= amountValue)) return false;
            break;
          case '==':
            if (!(balance === amountValue)) return false;
            break;
        }
      }
    }

    return true;
  });

  const dataInPage = filteredCredits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && filteredCredits.length === 0;

  return (
    <>
      <Head>
        <title>Customer Credit | Tiffin Management</title>
      </Head>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Customer Credit"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Customer Credit' },
          ]}
          action={
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-back-outline" />}
              onClick={() => router.push(PATH_DASHBOARD.payments.refunds)}
            >
              View Refunds
            </Button>
          }
        />

        {/* Analytics Cards */}
        <Card sx={{ mb: 5 }}>
          <Scrollbar>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2 }}
            >
              <CreditAnalytic
                title="Total"
                total={credits.length}
                percent={100}
                price={sumBy(credits, (c) => Number(c.current_balance) || 0)}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <CreditAnalytic
                title="Available"
                total={getStatusCount('available')}
                percent={getPercentByStatus('available')}
                price={getTotalAmountByStatus('available')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
              />

              <CreditAnalytic
                title="Used"
                total={getStatusCount('used')}
                percent={getPercentByStatus('used')}
                price={getTotalAmountByStatus('used')}
                icon="eva:shopping-cart-fill"
                color={theme.palette.grey[500]}
              />

              <CreditAnalytic
                title="Refunded"
                total={getStatusCount('refunded')}
                percent={getPercentByStatus('refunded')}
                price={getTotalAmountByStatus('refunded')}
                icon="mdi:cash-refund"
                color={theme.palette.warning.main}
              />
            </Stack>
          </Scrollbar>
        </Card>

        <Card>
          {/* Status Tabs */}
          <Tabs
            value={filterStatus}
            onChange={handleFilterStatus}
            sx={{
              px: 2,
              bgcolor: 'background.neutral',
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={
                  <Label color={tab.color} sx={{ mr: 1 }}>
                    {tab.count}
                  </Label>
                }
              />
            ))}
          </Tabs>

          <Divider />

          {/* Toolbar */}
          <CreditTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterStartDate={filterStartDate}
            filterEndDate={filterEndDate}
            filterAmountOperator={filterAmountOperator}
            filterAmountValue={filterAmountValue}
            onFilterName={handleFilterName}
            onFilterStartDate={handleFilterStartDate}
            onFilterEndDate={handleFilterEndDate}
            onFilterAmountOperator={handleFilterAmountOperator}
            onFilterAmountValue={handleFilterAmountValue}
            onResetFilter={handleResetFilter}
            onPrint={handlePrint}
            onImport={handleImport}
            onExport={handleExport}
          />

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                <Scrollbar>
                  <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                    <TableHeadCustom headLabel={TABLE_HEAD} />

                    <TableBody>
                      {dataInPage.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {fDate(row.created_at)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              from payment on {fDate(row.payment_date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.customer_name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {fCurrency(row.original_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="subtitle2"
                              color={row.current_balance > 0 ? 'success.main' : 'text.secondary'}
                            >
                              {fCurrency(row.current_balance)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{getStatusLabel(row.status)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                              <Tooltip title="View History">
                                <IconButton
                                  size="small"
                                  color="info"
                                  onClick={() => handleOpenHistory(row)}
                                >
                                  <Iconify icon="eva:clock-outline" />
                                </IconButton>
                              </Tooltip>
                              {row.status === 'available' && row.current_balance > 0 && (
                                <>
                                  <Tooltip title="Apply to Invoice">
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => router.push(`/dashboard/payments/allocate?creditId=${row.id}&customerId=${row.customer_id}`)}
                                    >
                                      <Iconify icon="eva:file-text-outline" />
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Process Refund">
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => handleOpenRefund(row)}
                                    >
                                      <Iconify icon="mdi:cash-refund" />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableEmptyRows
                        height={dense ? 52 : 72}
                        emptyRows={emptyRows(page, rowsPerPage, filteredCredits.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={filteredCredits.length}
                page={page}
                rowsPerPage={rowsPerPage}
                onPageChange={onChangePage}
                onRowsPerPageChange={onChangeRowsPerPage}
                dense={dense}
                onChangeDense={onChangeDense}
              />
            </>
          )}
        </Card>
      </Container>

      {/* Refund Dialog */}
      <Dialog open={openRefund} onClose={handleCloseRefund} maxWidth="sm" fullWidth>
        <DialogTitle>Process Refund</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedCredit && (
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Alert severity="info">
                  Customer: <strong>{selectedCredit.customer_name}</strong>
                  <br />
                  Available Credit: <strong>{fCurrency(selectedCredit.current_balance)}</strong>
                </Alert>
              </Stack>
            )}

            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Refund Amount *"
                type="number"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                inputProps={{
                  min: 0,
                  max: selectedCredit?.current_balance,
                  step: 0.01,
                }}
                InputProps={{
                  startAdornment: <Typography color="text.secondary">$</Typography>,
                }}
                helperText={`Maximum: ${fCurrency(selectedCredit?.current_balance || 0)}`}
              />

              <TextField
                fullWidth
                select
                label="Refund Method *"
                value={refundMethod}
                onChange={(e) => setRefundMethod(e.target.value)}
              >
                {REFUND_METHODS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <DatePicker
                label="Refund Date *"
                value={refundDate}
                onChange={(newValue) => setRefundDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />

              <TextField
                fullWidth
                label="Reason *"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                multiline
                rows={2}
              />
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRefund}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSubmitRefund}
            disabled={submitting || !refundAmount || !refundMethod || !refundReason}
          >
            {submitting ? 'Processing...' : 'Create Refund Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Credit History Dialog */}
      <Dialog open={openHistory} onClose={handleCloseHistory} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="eva:clock-outline" width={24} />
            <Typography variant="h6">Credit History</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {loadingHistory ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          ) : creditHistory && (
            <Box sx={{ pt: 2 }}>
              {/* Credit Summary */}
              <Card sx={{ p: 2, mb: 3, bgcolor: 'background.neutral' }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Customer</Typography>
                    <Typography variant="body1">{creditHistory.customer_name}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="subtitle2" color="text.secondary">Original Amount</Typography>
                    <Typography variant="body1">{fCurrency(creditHistory.original_amount)}</Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="subtitle2" color="text.secondary">Current Balance</Typography>
                    <Typography variant="body1" color={creditHistory.current_balance > 0 ? 'success.main' : 'text.secondary'}>
                      {fCurrency(creditHistory.current_balance)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                    {getStatusLabel(creditHistory.status)}
                  </Grid>
                  <Grid item xs={6} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">Created</Typography>
                    <Typography variant="body2">{fDateTime(creditHistory.created_at)}</Typography>
                  </Grid>
                </Grid>
              </Card>

              {/* Source Payment */}
              {creditHistory.source_payment && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    <Iconify icon="eva:credit-card-fill" width={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Source Payment
                  </Typography>
                  <Card variant="outlined" sx={{ p: 2 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Payment Date</Typography>
                        <Typography variant="body2">{fDate(creditHistory.source_payment.payment_date)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Amount</Typography>
                        <Typography variant="body2">{fCurrency(creditHistory.source_payment.amount)}</Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Type</Typography>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {creditHistory.source_payment.payment_type}
                        </Typography>
                      </Grid>
                      <Grid item xs={6} sm={3}>
                        <Typography variant="caption" color="text.secondary">Reference</Typography>
                        <Typography variant="body2">
                          {creditHistory.source_payment.reference_number || '-'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Card>
                </Box>
              )}

              {/* Usage History */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  <Iconify icon="eva:shopping-cart-fill" width={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Credit Usage ({creditHistory.usage_history.length})
                </Typography>
                {creditHistory.usage_history.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>No credit usage recorded</Alert>
                ) : (
                  <TableContainer component={Card} variant="outlined">
                    <Table size="small">
                      <TableHeadCustom
                        headLabel={[
                          { id: 'date', label: 'Date', align: 'left' },
                          { id: 'invoice', label: 'Invoice', align: 'left' },
                          { id: 'billing_month', label: 'Billing Month', align: 'left' },
                          { id: 'amount', label: 'Amount Used', align: 'right' },
                        ]}
                      />
                      <TableBody>
                        {creditHistory.usage_history.map((usage) => (
                          <TableRow key={usage.id}>
                            <TableCell>{fDateTime(usage.used_at)}</TableCell>
                            <TableCell>{usage.invoice_number || `#${usage.billing_id}`}</TableCell>
                            <TableCell>{usage.billing_month}</TableCell>
                            <TableCell align="right">
                              <Typography color="error.main">{fCurrency(usage.amount_used)}</Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              {/* Refund History */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  <Iconify icon="mdi:cash-refund" width={20} sx={{ mr: 1, verticalAlign: 'middle' }} />
                  Refunds ({creditHistory.refund_history.length})
                </Typography>
                {creditHistory.refund_history.length === 0 ? (
                  <Alert severity="info" sx={{ mt: 1 }}>No refunds recorded</Alert>
                ) : (
                  <TableContainer component={Card} variant="outlined">
                    <Table size="small">
                      <TableHeadCustom
                        headLabel={[
                          { id: 'date', label: 'Date', align: 'left' },
                          { id: 'amount', label: 'Amount', align: 'right' },
                          { id: 'method', label: 'Method', align: 'left' },
                          { id: 'reference', label: 'Reference', align: 'left' },
                          { id: 'status', label: 'Status', align: 'center' },
                        ]}
                      />
                      <TableBody>
                        {creditHistory.refund_history.map((refund) => (
                          <TableRow key={refund.id}>
                            <TableCell>{fDate(refund.refund_date)}</TableCell>
                            <TableCell align="right">{fCurrency(refund.refund_amount)}</TableCell>
                            <TableCell sx={{ textTransform: 'capitalize' }}>{refund.refund_method}</TableCell>
                            <TableCell>{refund.reference_number || '-'}</TableCell>
                            <TableCell align="center">{getRefundStatusLabel(refund.status)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseHistory}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
