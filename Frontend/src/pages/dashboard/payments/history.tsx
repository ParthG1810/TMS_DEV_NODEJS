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
  TableHead,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Box,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import Label from '../../../components/label';
import ConfirmDialog from '../../../components/confirm-dialog';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '../../../components/table';
import { fCurrency } from '../../../utils/formatNumber';
import { fDateTime, fDate } from '../../../utils/formatTime';
import { PaymentAnalytic, PaymentTableToolbar } from '../../../sections/@dashboard/payments/history/list';

// ----------------------------------------------------------------------

// Helper function for sumBy
function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

// ----------------------------------------------------------------------

interface PaymentRecord {
  id: number;
  payment_type: 'online' | 'cash';
  payment_source: string | null;
  customer_id: number;
  customer_name: string;
  amount: number;
  total_allocated: number;
  excess_amount: number;
  allocation_status: 'unallocated' | 'partial' | 'fully_allocated' | 'has_excess';
  payment_date: string;
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  deleted_flag: number;
}

interface PaymentAllocation {
  id: number;
  billing_id: number;
  invoice_number: string;
  customer_name: string;
  billing_month: string;
  allocated_amount: number;
  credit_amount: number;
  resulting_status: string;
}

const TABLE_HEAD = [
  { id: 'payment_date', label: 'Date', align: 'left' },
  { id: 'payment_type', label: 'Type', align: 'left' },
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'amount', label: 'Amount', align: 'right' },
  { id: 'total_allocated', label: 'Allocated', align: 'right' },
  { id: 'excess_amount', label: 'Credit', align: 'right' },
  { id: 'allocation_status', label: 'Status', align: 'center' },
  { id: 'actions', label: '', align: 'right' },
];

// ----------------------------------------------------------------------

PaymentHistoryPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function PaymentHistoryPage() {
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
  } = useTable({ defaultOrderBy: 'payment_date', defaultOrder: 'desc' });

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterPaymentType, setFilterPaymentType] = useState('');
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [openDeleteReason, setOpenDeleteReason] = useState(false);
  const [openDetails, setOpenDetails] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [paymentAllocations, setPaymentAllocations] = useState<PaymentAllocation[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/payment-records');
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      enqueueSnackbar('Failed to fetch payments', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return payments.length;
    return payments.filter((payment) => payment.allocation_status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(payments, (payment) => Number(payment.amount) || 0);
    return sumBy(
      payments.filter((payment) => payment.allocation_status === status),
      (payment) => Number(payment.amount) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (payments.length === 0) return 0;
    return (getStatusCount(status) / payments.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: payments.length },
    { value: 'unallocated', label: 'Unallocated', color: 'warning', count: getStatusCount('unallocated') },
    { value: 'partial', label: 'Partial', color: 'secondary', count: getStatusCount('partial') },
    { value: 'fully_allocated', label: 'Allocated', color: 'success', count: getStatusCount('fully_allocated') },
    { value: 'has_excess', label: 'Has Credit', color: 'primary', count: getStatusCount('has_excess') },
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

  const handleFilterPaymentType = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterPaymentType(event.target.value);
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
    setFilterPaymentType('');
    setFilterAmountOperator('');
    setFilterAmountValue('');
  };

  const isFiltered =
    filterStatus !== 'all' ||
    filterStartDate !== null ||
    filterEndDate !== null ||
    filterName !== '' ||
    filterPaymentType !== '' ||
    filterAmountOperator !== '';

  const handleViewDetails = async (payment: PaymentRecord) => {
    setSelectedPayment(payment);
    setOpenDetails(true);
    setLoadingDetails(true);

    try {
      const response = await axios.get(`/api/payment-records/${payment.id}/allocations`);
      if (response.data.success) {
        setPaymentAllocations(response.data.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching allocations:', error);
      setPaymentAllocations([]);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPayment || !deleteReason.trim()) {
      enqueueSnackbar('Please provide a reason for deletion', { variant: 'warning' });
      return;
    }

    try {
      setDeleting(true);
      const response = await axios.delete(`/api/payment-records/${selectedPayment.id}`, {
        data: { delete_reason: deleteReason },
      });

      if (response.data.success) {
        enqueueSnackbar('Payment deleted successfully', { variant: 'success' });
        setOpenDeleteReason(false);
        setOpenDelete(false);
        setDeleteReason('');
        fetchPayments();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      enqueueSnackbar(error.message || 'Failed to delete payment', { variant: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'unallocated':
        return <Label color="warning">Unallocated</Label>;
      case 'partial':
        return <Label color="info">Partial</Label>;
      case 'fully_allocated':
        return <Label color="success">Allocated</Label>;
      case 'has_excess':
        return <Label color="primary">Has Credit</Label>;
      default:
        return <Label>{status}</Label>;
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'online') {
      return <Iconify icon="mdi:credit-card-outline" width={20} />;
    }
    return <Iconify icon="mdi:cash" width={20} />;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payment History Report</title>
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
          <h1>Payment History Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Customer</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Allocated</th>
                <th class="text-right">Credit</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredPayments.map((payment) => `
                <tr>
                  <td>${new Date(payment.payment_date).toLocaleDateString()}</td>
                  <td>${payment.payment_type === 'online' ? 'Interac' : 'Cash'}</td>
                  <td>${payment.customer_name}</td>
                  <td class="text-right">$${Number(payment.amount).toFixed(2)}</td>
                  <td class="text-right">$${Number(payment.total_allocated).toFixed(2)}</td>
                  <td class="text-right">$${Number(payment.excess_amount).toFixed(2)}</td>
                  <td>${payment.allocation_status}</td>
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

      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const line of dataLines) {
        try {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map((v) => v.replace(/^"|"$/g, '').trim());

          if (cleanValues.length < 4) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const paymentData = {
            payment_date: cleanValues[0] || new Date().toISOString().split('T')[0],
            payment_type: cleanValues[1] || 'cash',
            customer_id: parseInt(cleanValues[2]) || 0,
            amount: parseFloat(cleanValues[3]) || 0,
            reference_number: cleanValues[4] || null,
            notes: cleanValues[5] || null,
          };

          if (!paymentData.customer_id || !paymentData.amount) {
            errorCount++;
            errors.push(`Line skipped: missing required fields`);
            continue;
          }

          await axios.post('/api/payment-records', paymentData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} payment(s) successfully`, { variant: 'success' });
        fetchPayments();
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} record(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import payments', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'ID',
      'Payment Date',
      'Payment Type',
      'Customer ID',
      'Customer Name',
      'Amount',
      'Total Allocated',
      'Excess Amount',
      'Allocation Status',
      'Reference Number',
      'Notes',
      'Created At',
    ];

    const csvData = filteredPayments.map((payment) => [
      payment.id,
      payment.payment_date,
      payment.payment_type,
      payment.customer_id,
      `"${payment.customer_name || ''}"`,
      payment.amount,
      payment.total_allocated,
      payment.excess_amount,
      payment.allocation_status,
      `"${payment.reference_number || ''}"`,
      `"${payment.notes || ''}"`,
      payment.created_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payment-history-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Payments exported successfully', { variant: 'success' });
  };

  // Filter payments
  const filteredPayments = payments.filter((payment) => {
    // Status filter
    if (filterStatus !== 'all' && payment.allocation_status !== filterStatus) return false;

    // Date range filter
    if (filterStartDate || filterEndDate) {
      const paymentDate = new Date(payment.payment_date);
      if (filterStartDate && paymentDate < filterStartDate) return false;
      if (filterEndDate) {
        const endDatePlusOne = new Date(filterEndDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        if (paymentDate >= endDatePlusOne) return false;
      }
    }

    // Payment type filter
    if (filterPaymentType && payment.payment_type !== filterPaymentType) return false;

    // Search filter
    if (filterName) {
      const query = filterName.toLowerCase();
      const matchesSearch =
        payment.customer_name.toLowerCase().includes(query) ||
        (payment.reference_number && payment.reference_number.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Amount filter
    if (filterAmountOperator && filterAmountValue) {
      const amountValue = parseFloat(filterAmountValue);
      if (!isNaN(amountValue)) {
        const amount = Number(payment.amount);
        switch (filterAmountOperator) {
          case '>':
            if (!(amount > amountValue)) return false;
            break;
          case '>=':
            if (!(amount >= amountValue)) return false;
            break;
          case '<':
            if (!(amount < amountValue)) return false;
            break;
          case '<=':
            if (!(amount <= amountValue)) return false;
            break;
          case '==':
            if (!(amount === amountValue)) return false;
            break;
        }
      }
    }

    return true;
  });

  const dataInPage = filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && filteredPayments.length === 0;

  return (
    <>
      <Head>
        <title>Payment History | Tiffin Management</title>
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
          heading="Payment History"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'History' },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="mdi:email-sync" />}
                onClick={() => router.push(PATH_DASHBOARD.payments.interac)}
              >
                Interac Transactions
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" />}
                onClick={() => router.push(PATH_DASHBOARD.payments.cashPayment)}
              >
                Record Cash Payment
              </Button>
            </Stack>
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
              <PaymentAnalytic
                title="Total"
                total={payments.length}
                percent={100}
                price={getTotalAmountByStatus('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <PaymentAnalytic
                title="Unallocated"
                total={getStatusCount('unallocated')}
                percent={getPercentByStatus('unallocated')}
                price={getTotalAmountByStatus('unallocated')}
                icon="eva:clock-fill"
                color={theme.palette.warning.main}
              />

              <PaymentAnalytic
                title="Partial"
                total={getStatusCount('partial')}
                percent={getPercentByStatus('partial')}
                price={getTotalAmountByStatus('partial')}
                icon="eva:pie-chart-fill"
                color={theme.palette.secondary.main}
              />

              <PaymentAnalytic
                title="Allocated"
                total={getStatusCount('fully_allocated')}
                percent={getPercentByStatus('fully_allocated')}
                price={getTotalAmountByStatus('fully_allocated')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
              />

              <PaymentAnalytic
                title="Has Credit"
                total={getStatusCount('has_excess')}
                percent={getPercentByStatus('has_excess')}
                price={getTotalAmountByStatus('has_excess')}
                icon="eva:star-fill"
                color={theme.palette.primary.main}
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
          <PaymentTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterStartDate={filterStartDate}
            filterEndDate={filterEndDate}
            filterPaymentType={filterPaymentType}
            filterAmountOperator={filterAmountOperator}
            filterAmountValue={filterAmountValue}
            onFilterName={handleFilterName}
            onFilterStartDate={handleFilterStartDate}
            onFilterEndDate={handleFilterEndDate}
            onFilterPaymentType={handleFilterPaymentType}
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
                  <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
                    <TableHeadCustom headLabel={TABLE_HEAD} />

                    <TableBody>
                      {dataInPage.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {fDate(row.payment_date)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fDateTime(row.created_at, 'HH:mm')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              {getTypeIcon(row.payment_type)}
                              <Box>
                                <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                  {row.payment_type}
                                </Typography>
                                {row.reference_number && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                    {row.reference_number}
                                  </Typography>
                                )}
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.customer_name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" color="success.main">
                              {fCurrency(row.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="body2">
                              {fCurrency(row.total_allocated)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {row.excess_amount > 0 ? (
                              <Chip
                                size="small"
                                label={fCurrency(row.excess_amount)}
                                color="primary"
                                variant="soft"
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">-</Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">{getStatusLabel(row.allocation_status)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              <Tooltip title="View details">
                                <IconButton size="small" onClick={() => handleViewDetails(row)}>
                                  <Iconify icon="eva:eye-outline" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedPayment(row);
                                    setOpenDelete(true);
                                  }}
                                >
                                  <Iconify icon="eva:trash-2-outline" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableEmptyRows
                        height={dense ? 52 : 72}
                        emptyRows={emptyRows(page, rowsPerPage, filteredPayments.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={filteredPayments.length}
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={openDelete}
        onClose={() => setOpenDelete(false)}
        title="Delete Payment"
        content="Are you sure you want to delete this payment? This will reverse all allocations and update invoice balances. You will need to provide a reason for the deletion."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setOpenDelete(false);
              setOpenDeleteReason(true);
            }}
          >
            Continue
          </Button>
        }
      />

      {/* Delete Reason Dialog */}
      <Dialog open={openDeleteReason} onClose={() => setOpenDeleteReason(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Provide Deletion Reason</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedPayment && (
              <Stack spacing={1} sx={{ mb: 3 }}>
                <Typography variant="body2">
                  Customer: <strong>{selectedPayment.customer_name}</strong>
                </Typography>
                <Typography variant="body2">
                  Amount: <strong>{fCurrency(selectedPayment.amount)}</strong>
                </Typography>
                <Typography variant="body2">
                  Date: <strong>{fDate(selectedPayment.payment_date)}</strong>
                </Typography>
              </Stack>
            )}
            <TextField
              fullWidth
              label="Reason for Deletion *"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              multiline
              rows={3}
              placeholder="Please explain why this payment is being deleted..."
              error={!deleteReason.trim()}
              helperText={!deleteReason.trim() ? 'Reason is required' : ''}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteReason(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            disabled={deleting || !deleteReason.trim()}
          >
            {deleting ? 'Deleting...' : 'Delete Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={openDetails} onClose={() => setOpenDetails(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Iconify icon="eva:file-text-outline" width={24} />
            <span>Payment Details</span>
          </Stack>
        </DialogTitle>
        <DialogContent>
          {selectedPayment && (
            <Box sx={{ pt: 2 }}>
              {/* Payment Summary */}
              <Card variant="outlined" sx={{ p: 2, mb: 3 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Customer</Typography>
                    <Typography variant="subtitle2">{selectedPayment.customer_name}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Payment Type</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {getTypeIcon(selectedPayment.payment_type)}
                      <Typography variant="subtitle2" sx={{ textTransform: 'capitalize' }}>
                        {selectedPayment.payment_type === 'online' ? 'Interac e-Transfer' : 'Cash'}
                      </Typography>
                    </Stack>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                    <Typography variant="subtitle2">{fDate(selectedPayment.payment_date)}</Typography>
                  </Stack>
                  {selectedPayment.reference_number && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Reference</Typography>
                      <Typography variant="subtitle2" sx={{ fontFamily: 'monospace' }}>
                        {selectedPayment.reference_number}
                      </Typography>
                    </Stack>
                  )}
                  <Divider />
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Total Amount</Typography>
                    <Typography variant="h6" color="success.main">{fCurrency(selectedPayment.amount)}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Allocated</Typography>
                    <Typography variant="subtitle2">{fCurrency(selectedPayment.total_allocated)}</Typography>
                  </Stack>
                  {Math.round(paymentAllocations.reduce((sum, a) => sum + (a.credit_amount || 0), 0) * 100) / 100 > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Credit Used</Typography>
                      <Chip size="small" label={fCurrency(Math.round(paymentAllocations.reduce((sum, a) => sum + (a.credit_amount || 0), 0) * 100) / 100)} color="info" />
                    </Stack>
                  )}
                  {selectedPayment.excess_amount > 0 && (
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Excess (New Credit)</Typography>
                      <Chip size="small" label={fCurrency(selectedPayment.excess_amount)} color="success" />
                    </Stack>
                  )}
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    {getStatusLabel(selectedPayment.allocation_status)}
                  </Stack>
                  {selectedPayment.notes && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>Notes</Typography>
                        <Typography variant="body2">{selectedPayment.notes}</Typography>
                      </Box>
                    </>
                  )}
                </Stack>
              </Card>

              {/* Allocations */}
              <Typography variant="subtitle1" gutterBottom>
                Allocations
              </Typography>
              {loadingDetails ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : paymentAllocations.length > 0 ? (
                <TableContainer component={Card} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Invoice</TableCell>
                        <TableCell align="right">Payment</TableCell>
                        <TableCell align="right">Credit</TableCell>
                        <TableCell align="center">Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentAllocations.map((alloc) => (
                        <TableRow key={alloc.id}>
                          <TableCell>
                            <Typography
                              variant="body2"
                              component="span"
                              onClick={() => {
                                setOpenDetails(false);
                                router.push(PATH_DASHBOARD.tiffin.invoiceDetails(String(alloc.billing_id)));
                              }}
                              sx={{
                                cursor: 'pointer',
                                color: 'primary.main',
                                fontWeight: 500,
                                '&:hover': {
                                  textDecoration: 'underline',
                                },
                              }}
                            >
                              {alloc.invoice_number || `Invoice #${alloc.billing_id}`}
                            </Typography>
                            {alloc.customer_name && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {alloc.customer_name}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" color="success.main">
                              {fCurrency(alloc.allocated_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {alloc.credit_amount > 0 ? (
                              <Typography variant="subtitle2" color="info.main">
                                {fCurrency(alloc.credit_amount)}
                              </Typography>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                -
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center">
                            <Label color={alloc.resulting_status === 'paid' ? 'success' : 'warning'}>
                              {alloc.resulting_status === 'paid' ? 'Paid' : 'Partial'}
                            </Label>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary" align="center">
                    No allocations yet
                  </Typography>
                </Card>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetails(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
