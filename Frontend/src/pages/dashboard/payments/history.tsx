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
  InputAdornment,
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

const TYPE_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'online', label: 'Online (Interac)' },
  { value: 'cash', label: 'Cash' },
];

// ----------------------------------------------------------------------

PaymentHistoryPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function PaymentHistoryPage() {
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
  } = useTable({ defaultOrderBy: 'payment_date', defaultOrder: 'desc' });

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [filterType, setFilterType] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [openDelete, setOpenDelete] = useState(false);
  const [openDeleteReason, setOpenDeleteReason] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType !== 'all') {
        params.payment_type = filterType;
      }
      if (filterStartDate) {
        params.start_date = filterStartDate.toISOString().split('T')[0];
      }
      if (filterEndDate) {
        params.end_date = filterEndDate.toISOString().split('T')[0];
      }
      const response = await axios.get('/api/payment-records', { params });
      if (response.data.success) {
        setPayments(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error);
      enqueueSnackbar('Failed to fetch payments', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStartDate, filterEndDate, enqueueSnackbar]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleFilterType = (_event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterType(newValue);
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

  // Filter by search query
  const filteredPayments = payments.filter((payment) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      payment.customer_name.toLowerCase().includes(query) ||
      (payment.reference_number && payment.reference_number.toLowerCase().includes(query))
    );
  });

  const dataInPage = filteredPayments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && filteredPayments.length === 0;

  return (
    <>
      <Head>
        <title>Payment History | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
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

        <Card>
          <Tabs
            value={filterType}
            onChange={handleFilterType}
            sx={{
              px: 2,
              bgcolor: 'background.neutral',
            }}
          >
            {TYPE_OPTIONS.map((tab) => (
              <Tab key={tab.value} value={tab.value} label={tab.label} />
            ))}
          </Tabs>

          <Divider />

          {/* Filters */}
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ p: 2.5 }}
            alignItems="center"
          >
            <TextField
              size="small"
              placeholder="Search by customer or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ minWidth: 250 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-outline" />
                  </InputAdornment>
                ),
              }}
            />
            <DatePicker
              label="Start Date"
              value={filterStartDate}
              onChange={(newValue) => setFilterStartDate(newValue)}
              renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 150 }} />}
            />
            <DatePicker
              label="End Date"
              value={filterEndDate}
              onChange={(newValue) => setFilterEndDate(newValue)}
              renderInput={(params) => <TextField {...params} size="small" sx={{ minWidth: 150 }} />}
            />
            {(filterStartDate || filterEndDate || searchQuery) && (
              <Button
                variant="soft"
                onClick={() => {
                  setFilterStartDate(null);
                  setFilterEndDate(null);
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            )}
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
                                <IconButton size="small">
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
    </>
  );
}
