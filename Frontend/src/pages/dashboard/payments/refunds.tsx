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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
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
  TableHeadCustom,
  TablePaginationCustom,
} from '../../../components/table';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate, fDateTime } from '../../../utils/formatTime';

// ----------------------------------------------------------------------

interface RefundRecord {
  id: number;
  source_type: 'credit' | 'payment';
  credit_id: number | null;
  payment_record_id: number | null;
  customer_id: number;
  customer_name: string;
  refund_amount: number;
  refund_method: string;
  refund_date: string;
  reference_number: string | null;
  reason: string;
  status: 'pending' | 'completed' | 'cancelled';
  requested_by: number;
  approved_by: number | null;
  approved_at: string | null;
  created_at: string;
}

const TABLE_HEAD = [
  { id: 'created_at', label: 'Requested', align: 'left' },
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'refund_amount', label: 'Amount', align: 'right' },
  { id: 'refund_method', label: 'Method', align: 'left' },
  { id: 'reason', label: 'Reason', align: 'left' },
  { id: 'status', label: 'Status', align: 'center' },
  { id: 'actions', label: '', align: 'right' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

// ----------------------------------------------------------------------

RefundsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function RefundsPage() {
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
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState('pending');
  const [openApprove, setOpenApprove] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterStatus !== 'all') {
        params.status = filterStatus;
      }
      const response = await axios.get('/api/refunds', { params });
      if (response.data.success) {
        setRefunds(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      enqueueSnackbar('Failed to fetch refunds', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterStatus, enqueueSnackbar]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleFilterStatus = (_event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterStatus(newValue);
  };

  const handleApprove = async () => {
    if (!selectedRefund) return;

    try {
      setProcessing(true);
      const response = await axios.put(`/api/refunds/${selectedRefund.id}`, {
        action: 'approve',
        approved_by: 1, // TODO: Get actual user ID
        reference_number: referenceNumber || undefined,
      });

      if (response.data.success) {
        enqueueSnackbar('Refund approved and processed', { variant: 'success' });
        setOpenApprove(false);
        setReferenceNumber('');
        fetchRefunds();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error approving refund:', error);
      enqueueSnackbar(error.message || 'Failed to approve refund', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!selectedRefund) return;

    try {
      setProcessing(true);
      const response = await axios.put(`/api/refunds/${selectedRefund.id}`, {
        action: 'cancel',
      });

      if (response.data.success) {
        enqueueSnackbar('Refund cancelled', { variant: 'success' });
        setOpenCancel(false);
        fetchRefunds();
      } else {
        throw new Error(response.data.error);
      }
    } catch (error: any) {
      console.error('Error cancelling refund:', error);
      enqueueSnackbar(error.message || 'Failed to cancel refund', { variant: 'error' });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return <Label color="warning">Pending</Label>;
      case 'completed':
        return <Label color="success">Completed</Label>;
      case 'cancelled':
        return <Label color="error">Cancelled</Label>;
      default:
        return <Label>{status}</Label>;
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Cash';
      case 'interac':
        return 'Interac e-Transfer';
      case 'cheque':
        return 'Cheque';
      default:
        return method;
    }
  };

  // Calculate pending totals
  const pendingTotal = refunds
    .filter(r => r.status === 'pending')
    .reduce((sum, r) => sum + r.refund_amount, 0);

  const pendingCount = refunds.filter(r => r.status === 'pending').length;

  const dataInPage = refunds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && refunds.length === 0;

  return (
    <>
      <Head>
        <title>Refunds | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Refunds Management"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Payments', href: PATH_DASHBOARD.payments.root },
            { name: 'Refunds' },
          ]}
          action={
            <Button
              variant="outlined"
              startIcon={<Iconify icon="mdi:credit-card-multiple" />}
              onClick={() => router.push(PATH_DASHBOARD.payments.credit)}
            >
              Customer Credit
            </Button>
          }
        />

        {/* Summary Card */}
        {pendingCount > 0 && (
          <Card sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={6}>
                <Stack direction="row" spacing={3} alignItems="center">
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: 2,
                      bgcolor: 'warning.lighter',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Iconify icon="mdi:clock-outline" width={32} color="warning.main" />
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Pending Refunds
                    </Typography>
                    <Typography variant="h4">
                      {pendingCount} requests
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total: {fCurrency(pendingTotal)}
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Alert severity="warning">
                  You have {pendingCount} pending refund request{pendingCount > 1 ? 's' : ''} awaiting approval.
                </Alert>
              </Grid>
            </Grid>
          </Card>
        )}

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
                  <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 900 }}>
                    <TableHeadCustom headLabel={TABLE_HEAD} />

                    <TableBody>
                      {dataInPage.map((row) => (
                        <TableRow key={row.id} hover>
                          <TableCell>
                            <Typography variant="body2">
                              {fDate(row.created_at)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fDateTime(row.created_at, 'HH:mm')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{row.customer_name}</Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography variant="subtitle2" color="error.main">
                              {fCurrency(row.refund_amount)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{getMethodLabel(row.refund_method)}</Typography>
                            {row.reference_number && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                Ref: {row.reference_number}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{
                                maxWidth: 200,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {row.reason}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">{getStatusLabel(row.status)}</TableCell>
                          <TableCell align="right">
                            {row.status === 'pending' && (
                              <Stack direction="row" spacing={1} justifyContent="flex-end">
                                <Tooltip title="Approve & Process">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      setSelectedRefund(row);
                                      setOpenApprove(true);
                                    }}
                                  >
                                    <Iconify icon="eva:checkmark-circle-2-outline" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      setSelectedRefund(row);
                                      setOpenCancel(true);
                                    }}
                                  >
                                    <Iconify icon="eva:close-circle-outline" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            )}
                            {row.status === 'completed' && row.approved_at && (
                              <Typography variant="caption" color="text.secondary">
                                Approved: {fDate(row.approved_at)}
                              </Typography>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}

                      <TableEmptyRows
                        height={dense ? 52 : 72}
                        emptyRows={emptyRows(page, rowsPerPage, refunds.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={refunds.length}
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

      {/* Approve Dialog */}
      <Dialog open={openApprove} onClose={() => setOpenApprove(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Approve & Process Refund</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            {selectedRefund && (
              <Stack spacing={2} sx={{ mb: 3 }}>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Customer:</strong> {selectedRefund.customer_name}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Amount:</strong> {fCurrency(selectedRefund.refund_amount)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Method:</strong> {getMethodLabel(selectedRefund.refund_method)}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Reason:</strong> {selectedRefund.reason}
                  </Typography>
                </Alert>
              </Stack>
            )}

            <TextField
              fullWidth
              label="Reference Number (Optional)"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="Enter transaction reference if available"
              helperText="E.g., Interac confirmation number, cheque number"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenApprove(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="success"
            onClick={handleApprove}
            disabled={processing}
            startIcon={processing ? <CircularProgress size={20} /> : <Iconify icon="eva:checkmark-circle-2-fill" />}
          >
            {processing ? 'Processing...' : 'Approve & Complete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={openCancel}
        onClose={() => setOpenCancel(false)}
        title="Cancel Refund"
        content={
          selectedRefund ? (
            <>
              Are you sure you want to cancel this refund request?
              <br /><br />
              <strong>Customer:</strong> {selectedRefund.customer_name}<br />
              <strong>Amount:</strong> {fCurrency(selectedRefund.refund_amount)}
            </>
          ) : ''
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={handleCancel}
            disabled={processing}
          >
            {processing ? 'Cancelling...' : 'Cancel Refund'}
          </Button>
        }
      />
    </>
  );
}
