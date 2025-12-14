import { useState, useEffect, useCallback } from 'react';
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
  InputAdornment,
} from '@mui/material';
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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'allocated', label: 'Allocated' },
  { value: 'ignored', label: 'Ignored' },
];

// ----------------------------------------------------------------------

InteracTransactionsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function InteracTransactionsPage() {
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

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
  const [transactions, setTransactions] = useState<InteracTransaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string>('email_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [openDelete, setOpenDelete] = useState(false);
  const [openCustomerMatch, setOpenCustomerMatch] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<InteracTransaction | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await axios.get('/api/interac-transactions', { params });
      if (response.data.success) {
        setTransactions(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      enqueueSnackbar('Failed to fetch transactions', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, enqueueSnackbar]);

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

  const handleFilterStatus = (_event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterStatus(newValue);
  };

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
      setOpenCustomerMatch(false);
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

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((tx) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        tx.sender_name.toLowerCase().includes(query) ||
        tx.reference_number.toLowerCase().includes(query) ||
        tx.amount.toString().includes(query) ||
        (tx.confirmed_customer_name && tx.confirmed_customer_name.toLowerCase().includes(query)) ||
        (tx.auto_matched_customer_name && tx.auto_matched_customer_name.toLowerCase().includes(query))
      );
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

      <Container maxWidth={themeStretch ? false : 'lg'}>
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

        <Card>
          <Tabs
            value={filterStatus}
            onChange={handleFilterStatus}
            sx={{
              px: 2,
              bgcolor: 'background.neutral',
            }}
          >
            {STATUS_OPTIONS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <Divider />

          {/* Search */}
          <Stack direction="row" spacing={2} sx={{ p: 2.5 }} alignItems="center">
            <TextField
              size="small"
              placeholder="Search by sender, reference, amount, or customer..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              sx={{ minWidth: 350 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-outline" />
                  </InputAdornment>
                ),
              }}
            />
            {searchQuery && (
              <Button
                variant="soft"
                size="small"
                onClick={() => setSearchQuery('')}
              >
                Clear
              </Button>
            )}
            <Box sx={{ flexGrow: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''}
            </Typography>
          </Stack>

          <Divider />

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
