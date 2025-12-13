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
  Grid,
  Alert,
  MenuItem,
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

const TABLE_HEAD = [
  { id: 'created_at', label: 'Date Created', align: 'left' },
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'original_amount', label: 'Original', align: 'right' },
  { id: 'current_balance', label: 'Balance', align: 'right' },
  { id: 'status', label: 'Status', align: 'center' },
  { id: 'actions', label: '', align: 'right' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'used', label: 'Used' },
  { value: 'refunded', label: 'Refunded' },
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
  } = useTable({ defaultOrderBy: 'created_at', defaultOrder: 'desc' });

  const [loading, setLoading] = useState(true);
  const [credits, setCredits] = useState<CustomerCredit[]>([]);
  const [filterStatus, setFilterStatus] = useState('available');
  const [openRefund, setOpenRefund] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CustomerCredit | null>(null);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundMethod, setRefundMethod] = useState('interac');
  const [refundReason, setRefundReason] = useState('');
  const [refundDate, setRefundDate] = useState<Date | null>(new Date());
  const [submitting, setSubmitting] = useState(false);

  const fetchCredits = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await axios.get('/api/customer-credit', { params });
      if (response.data.success) {
        setCredits(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching credits:', error);
      enqueueSnackbar('Failed to fetch customer credits', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, enqueueSnackbar]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  const handleFilterStatus = (_event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterStatus(newValue);
  };

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
        requested_by: 1, // TODO: Get actual user ID
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

  // Calculate totals
  const totalAvailable = credits
    .filter(c => c.status === 'available')
    .reduce((sum, c) => sum + c.current_balance, 0);

  const dataInPage = credits.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && credits.length === 0;

  return (
    <>
      <Head>
        <title>Customer Credit | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
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

        {/* Summary Card */}
        <Card sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Total Available Credit
                </Typography>
                <Typography variant="h3" color="success.main">
                  {fCurrency(totalAvailable)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={8}>
              <Alert severity="info">
                Customer credits are automatically created when a payment exceeds the total invoice amount.
                Credits can be applied to future invoices or refunded to the customer.
              </Alert>
            </Grid>
          </Grid>
        </Card>

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
                            {row.status === 'available' && row.current_balance > 0 && (
                              <Tooltip title="Process Refund">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleOpenRefund(row)}
                                >
                                  <Iconify icon="mdi:cash-refund" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableEmptyRows
                        height={dense ? 52 : 72}
                        emptyRows={emptyRows(page, rowsPerPage, credits.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={credits.length}
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
                slotProps={{
                  textField: { fullWidth: true },
                }}
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
    </>
  );
}
