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
  TableSortLabel,
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
  Autocomplete,
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
  TablePaginationCustom,
} from '../../../components/table';
import { fCurrency } from '../../../utils/formatNumber';
import { fDateTime } from '../../../utils/formatTime';
import { InteracAnalytic, InteracTableToolbar } from '../../../sections/@dashboard/payments/interac/list';

// ----------------------------------------------------------------------

// Helper function for sumBy
function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

// ----------------------------------------------------------------------

interface InteracTransaction {
  id: number;
  gmail_message_id: string;
  email_date: string;
  sender_name: string;
  reference_number: string;
  amount: number;
  auto_matched_customer_id: number | null;
  auto_matched_customer_name?: string;
  confirmed_customer_id: number | null;
  confirmed_customer_name?: string;
  match_confidence: number;
  status: 'pending' | 'allocated' | 'ignored' | 'deleted';
  created_at: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
}

// ----------------------------------------------------------------------

InteracTransactionsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function InteracTransactionsPage() {
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
  } = useTable({ defaultOrderBy: 'email_date', defaultOrder: 'desc' });

  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [transactions, setTransactions] = useState<InteracTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterName, setFilterName] = useState('');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');
  const [sortBy, setSortBy] = useState<string>('email_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openDelete, setOpenDelete] = useState(false);
  const [openCustomerMatch, setOpenCustomerMatch] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InteracTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/interac-transactions');
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      enqueueSnackbar('Failed to fetch transactions', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

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
    fetchTransactions();
    fetchCustomers();
  }, [fetchTransactions, fetchCustomers]);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return transactions.length;
    return transactions.filter((tx) => tx.status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(transactions, (tx) => Number(tx.amount) || 0);
    return sumBy(
      transactions.filter((tx) => tx.status === status),
      (tx) => Number(tx.amount) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (transactions.length === 0) return 0;
    return (getStatusCount(status) / transactions.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: transactions.length },
    { value: 'pending', label: 'Pending', color: 'warning', count: getStatusCount('pending') },
    { value: 'allocated', label: 'Allocated', color: 'success', count: getStatusCount('allocated') },
    { value: 'ignored', label: 'Ignored', color: 'default', count: getStatusCount('ignored') },
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
    setFilterName('');
    setFilterStartDate(null);
    setFilterEndDate(null);
    setFilterAmountOperator('');
    setFilterAmountValue('');
  };

  const isFiltered =
    filterStatus !== 'all' ||
    filterName !== '' ||
    filterStartDate !== null ||
    filterEndDate !== null ||
    filterAmountOperator !== '';

  const handleAllocate = (transaction: InteracTransaction) => {
    const customerId = transaction.confirmed_customer_id || transaction.auto_matched_customer_id;
    if (!customerId) {
      setSelectedTransaction(transaction);
      setOpenCustomerMatch(true);
    } else {
      router.push(`/dashboard/payments/allocate?transactionId=${transaction.id}`);
    }
  };

  const handleConfirmCustomer = async () => {
    if (!selectedTransaction || !selectedCustomer) return;

    try {
      await axios.put(`/api/interac-transactions/${selectedTransaction.id}`, {
        action: 'confirm_customer',
        customer_id: selectedCustomer.id,
      });
      enqueueSnackbar('Customer confirmed', { variant: 'success' });
      // Navigate first - dialog closes automatically when we navigate away
      // This avoids "Abort fetching component" race condition
      router.push(`/dashboard/payments/allocate?transactionId=${selectedTransaction.id}`);
    } catch (error: any) {
      console.error('Error confirming customer:', error);
      enqueueSnackbar('Failed to confirm customer', { variant: 'error' });
    }
  };

  const handleIgnore = async (transaction: InteracTransaction) => {
    try {
      await axios.put(`/api/interac-transactions/${transaction.id}`, {
        action: 'ignore',
      });
      enqueueSnackbar('Transaction ignored', { variant: 'success' });
      fetchTransactions();
    } catch (error: any) {
      console.error('Error ignoring transaction:', error);
      enqueueSnackbar('Failed to ignore transaction', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!selectedTransaction) return;

    try {
      await axios.delete(`/api/interac-transactions/${selectedTransaction.id}`);
      enqueueSnackbar('Transaction deleted', { variant: 'success' });
      setOpenDelete(false);
      fetchTransactions();
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      enqueueSnackbar('Failed to delete transaction', { variant: 'error' });
    }
  };

  const handleChangeCustomer = (transaction: InteracTransaction) => {
    setSelectedTransaction(transaction);
    const existingCustomerId = transaction.confirmed_customer_id || transaction.auto_matched_customer_id;
    const existingCustomer = customers.find(c => c.id === existingCustomerId) || null;
    setSelectedCustomer(existingCustomer);
    setOpenCustomerMatch(true);
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <Label color="warning">Pending</Label>;
      case 'allocated':
        return <Label color="success">Allocated</Label>;
      case 'ignored':
        return <Label color="default">Ignored</Label>;
      default:
        return <Label>{status}</Label>;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.5) return 'warning';
    return 'error';
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(0);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Interac e-Transfer Transactions</title>
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
          <h1>Interac e-Transfer Transactions Report</h1>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Sender</th>
                <th class="text-right">Amount</th>
                <th>Customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredTransactions.map((tx) => `
                <tr>
                  <td>${new Date(tx.email_date).toLocaleDateString()}</td>
                  <td>${tx.reference_number}</td>
                  <td>${tx.sender_name}</td>
                  <td class="text-right">$${Number(tx.amount).toFixed(2)}</td>
                  <td>${tx.confirmed_customer_name || tx.auto_matched_customer_name || '-'}</td>
                  <td>${tx.status}</td>
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

          const transactionData = {
            email_date: cleanValues[0] || new Date().toISOString(),
            reference_number: cleanValues[1] || '',
            sender_name: cleanValues[2] || '',
            amount: parseFloat(cleanValues[3]) || 0,
          };

          if (!transactionData.reference_number || !transactionData.sender_name || !transactionData.amount) {
            errorCount++;
            errors.push(`Line skipped: missing required fields`);
            continue;
          }

          await axios.post('/api/interac-transactions', transactionData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} transaction(s) successfully`, { variant: 'success' });
        fetchTransactions();
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} record(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import transactions', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'ID',
      'Email Date',
      'Reference Number',
      'Sender Name',
      'Amount',
      'Customer ID',
      'Customer Name',
      'Match Confidence',
      'Status',
      'Created At',
    ];

    const csvData = filteredTransactions.map((tx) => [
      tx.id,
      tx.email_date,
      `"${tx.reference_number || ''}"`,
      `"${tx.sender_name || ''}"`,
      tx.amount,
      tx.confirmed_customer_id || tx.auto_matched_customer_id || '',
      `"${tx.confirmed_customer_name || tx.auto_matched_customer_name || ''}"`,
      tx.match_confidence || '',
      tx.status,
      tx.created_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `interac-transactions-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Transactions exported successfully', { variant: 'success' });
  };

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      // Status filter
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;

      // Search filter
      if (filterName) {
        const query = filterName.toLowerCase();
        const matchesSearch =
          tx.sender_name.toLowerCase().includes(query) ||
          tx.reference_number.toLowerCase().includes(query) ||
          tx.amount.toString().includes(query) ||
          (tx.confirmed_customer_name && tx.confirmed_customer_name.toLowerCase().includes(query)) ||
          (tx.auto_matched_customer_name && tx.auto_matched_customer_name.toLowerCase().includes(query));
        if (!matchesSearch) return false;
      }

      // Date filters
      if (filterStartDate) {
        const txDate = new Date(tx.email_date);
        txDate.setHours(0, 0, 0, 0);
        const startDate = new Date(filterStartDate);
        startDate.setHours(0, 0, 0, 0);
        if (txDate < startDate) return false;
      }

      if (filterEndDate) {
        const txDate = new Date(tx.email_date);
        txDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filterEndDate);
        endDate.setHours(0, 0, 0, 0);
        if (txDate > endDate) return false;
      }

      // Amount filter
      if (filterAmountOperator && filterAmountValue) {
        const amountValue = parseFloat(filterAmountValue);
        if (!isNaN(amountValue)) {
          const amount = Number(tx.amount);
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
    })
    .sort((a, b) => {
      let aVal: any = a[sortBy as keyof InteracTransaction];
      let bVal: any = b[sortBy as keyof InteracTransaction];

      // Handle customer column specially
      if (sortBy === 'customer') {
        aVal = a.confirmed_customer_name || a.auto_matched_customer_name || '';
        bVal = b.confirmed_customer_name || b.auto_matched_customer_name || '';
      }

      // Handle null/undefined values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      // Numeric comparison for amount
      if (sortBy === 'amount') {
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // String comparison
      const comparison = String(aVal).localeCompare(String(bVal));
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const dataInPage = filteredTransactions.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && filteredTransactions.length === 0;

  return (
    <>
      <Head>
        <title>Interac Transactions | Tiffin Management</title>
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
          heading="Interac e-Transfer Transactions"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Interac Transactions' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => router.push(PATH_DASHBOARD.payments.cashPayment)}
            >
              Record Cash Payment
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
              <InteracAnalytic
                title="Total"
                total={transactions.length}
                percent={100}
                price={getTotalAmountByStatus('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <InteracAnalytic
                title="Pending"
                total={getStatusCount('pending')}
                percent={getPercentByStatus('pending')}
                price={getTotalAmountByStatus('pending')}
                icon="eva:clock-fill"
                color={theme.palette.warning.main}
              />

              <InteracAnalytic
                title="Allocated"
                total={getStatusCount('allocated')}
                percent={getPercentByStatus('allocated')}
                price={getTotalAmountByStatus('allocated')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
              />

              <InteracAnalytic
                title="Ignored"
                total={getStatusCount('ignored')}
                percent={getPercentByStatus('ignored')}
                price={getTotalAmountByStatus('ignored')}
                icon="eva:eye-off-fill"
                color={theme.palette.text.secondary}
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
          <InteracTableToolbar
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
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'email_date'}
                            direction={sortBy === 'email_date' ? sortOrder : 'asc'}
                            onClick={() => handleSort('email_date')}
                          >
                            Date
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'reference_number'}
                            direction={sortBy === 'reference_number' ? sortOrder : 'asc'}
                            onClick={() => handleSort('reference_number')}
                          >
                            Reference
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'sender_name'}
                            direction={sortBy === 'sender_name' ? sortOrder : 'asc'}
                            onClick={() => handleSort('sender_name')}
                          >
                            Sender
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">
                          <TableSortLabel
                            active={sortBy === 'amount'}
                            direction={sortBy === 'amount' ? sortOrder : 'asc'}
                            onClick={() => handleSort('amount')}
                          >
                            Amount
                          </TableSortLabel>
                        </TableCell>
                        <TableCell>
                          <TableSortLabel
                            active={sortBy === 'customer'}
                            direction={sortBy === 'customer' ? sortOrder : 'asc'}
                            onClick={() => handleSort('customer')}
                          >
                            Customer
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="center">
                          <TableSortLabel
                            active={sortBy === 'status'}
                            direction={sortBy === 'status' ? sortOrder : 'asc'}
                            onClick={() => handleSort('status')}
                          >
                            Status
                          </TableSortLabel>
                        </TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {dataInPage.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {fDateTime(row.email_date)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {row.reference_number}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.sender_name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" color="success.main">
                              {fCurrency(row.amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {row.confirmed_customer_name || row.auto_matched_customer_name ? (
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography variant="body2">
                                  {row.confirmed_customer_name || row.auto_matched_customer_name}
                                </Typography>
                                {!row.confirmed_customer_id && row.match_confidence > 0 && (
                                  <Tooltip title={`Match confidence: ${(row.match_confidence * 100).toFixed(0)}%`}>
                                    <Chip
                                      size="small"
                                      label={`${(row.match_confidence * 100).toFixed(0)}%`}
                                      color={getConfidenceColor(row.match_confidence)}
                                      variant="soft"
                                    />
                                  </Tooltip>
                                )}
                                {row.confirmed_customer_id && (
                                  <Chip size="small" label="Confirmed" color="success" variant="soft" />
                                )}
                                <Tooltip title="Change customer">
                                  <IconButton size="small" onClick={() => handleChangeCustomer(row)}>
                                    <Iconify icon="eva:edit-outline" width={16} />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                onClick={() => handleChangeCustomer(row)}
                              >
                                Select Customer
                              </Button>
                            )}
                          </TableCell>
                          <TableCell align="center">{getStatusLabel(row.status)}</TableCell>
                          <TableCell align="right">
                            {row.status === 'pending' && (
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Allocate to invoices">
                                  <IconButton
                                    color="primary"
                                    onClick={() => handleAllocate(row)}
                                  >
                                    <Iconify icon="eva:checkmark-circle-2-outline" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Ignore">
                                  <IconButton onClick={() => handleIgnore(row)}>
                                    <Iconify icon="eva:eye-off-outline" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Delete">
                                  <IconButton
                                    color="error"
                                    onClick={() => {
                                      setSelectedTransaction(row);
                                      setOpenDelete(true);
                                    }}
                                  >
                                    <Iconify icon="eva:trash-2-outline" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                            {row.status === 'allocated' && (
                              <Tooltip title="View payment details">
                                <IconButton onClick={() => router.push(PATH_DASHBOARD.payments.history)}>
                                  <Iconify icon="eva:eye-outline" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableEmptyRows
                        height={dense ? 52 : 72}
                        emptyRows={emptyRows(page, rowsPerPage, filteredTransactions.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={filteredTransactions.length}
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
        title="Delete Transaction"
        content="Are you sure you want to delete this transaction? This action cannot be undone."
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            Delete
          </Button>
        }
      />

      {/* Customer Match Dialog */}
      <Dialog open={openCustomerMatch} onClose={() => setOpenCustomerMatch(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Customer</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedTransaction && (
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Sender: <strong>{selectedTransaction.sender_name}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Amount: <strong>{fCurrency(selectedTransaction.amount)}</strong>
                </Typography>
              </Stack>
            )}
            <Autocomplete
              fullWidth
              options={customers}
              getOptionLabel={(option) => `${option.name}${option.phone ? ` (${option.phone})` : ''}`}
              value={selectedCustomer}
              onChange={(_, newValue) => setSelectedCustomer(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer"
                  placeholder="Search customer by name or phone..."
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
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCustomerMatch(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCustomer}
            disabled={!selectedCustomer}
          >
            Confirm & Allocate
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
