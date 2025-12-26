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
  Alert,
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
import { fDate, fDateTime } from '../../../utils/formatTime';
import { RefundAnalytic, RefundTableToolbar } from '../../../sections/@dashboard/payments/refund/list';

// ----------------------------------------------------------------------

// Helper function for sumBy
function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

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

// ----------------------------------------------------------------------

RefundsPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function RefundsPage() {
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
  const [refunds, setRefunds] = useState<RefundRecord[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');
  const [openApprove, setOpenApprove] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [selectedRefund, setSelectedRefund] = useState<RefundRecord | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchRefunds = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/refunds');
      if (response.data.success) {
        setRefunds(response.data.data);
      }
    } catch (error: any) {
      console.error('Error fetching refunds:', error);
      enqueueSnackbar('Failed to fetch refunds', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return refunds.length;
    return refunds.filter((refund) => refund.status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(refunds, (refund) => Number(refund.refund_amount) || 0);
    return sumBy(
      refunds.filter((refund) => refund.status === status),
      (refund) => Number(refund.refund_amount) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (refunds.length === 0) return 0;
    return (getStatusCount(status) / refunds.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: refunds.length },
    { value: 'pending', label: 'Pending', color: 'warning', count: getStatusCount('pending') },
    { value: 'completed', label: 'Completed', color: 'success', count: getStatusCount('completed') },
    { value: 'cancelled', label: 'Cancelled', color: 'error', count: getStatusCount('cancelled') },
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

  const handleApprove = async () => {
    if (!selectedRefund) return;

    try {
      setProcessing(true);
      const response = await axios.put(`/api/refunds/${selectedRefund.id}`, {
        action: 'approve',
        approved_by: 1,
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

  // Print handler
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Refunds Report</title>
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
          <h1>Refunds Report</h1>
          <table>
            <thead>
              <tr>
                <th>Requested</th>
                <th>Customer</th>
                <th class="text-right">Amount</th>
                <th>Method</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRefunds.map((refund) => `
                <tr>
                  <td>${new Date(refund.created_at).toLocaleDateString()}</td>
                  <td>${refund.customer_name}</td>
                  <td class="text-right">$${Number(refund.refund_amount).toFixed(2)}</td>
                  <td>${getMethodLabel(refund.refund_method)}</td>
                  <td>${refund.reason}</td>
                  <td>${refund.status}</td>
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

      enqueueSnackbar('CSV import for refunds is not supported', { variant: 'info' });
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import refunds', { variant: 'error' });
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
      'Refund Amount',
      'Refund Method',
      'Refund Date',
      'Reference Number',
      'Reason',
      'Status',
      'Created At',
      'Approved At',
    ];

    const csvData = filteredRefunds.map((refund) => [
      refund.id,
      refund.customer_id,
      `"${refund.customer_name || ''}"`,
      refund.refund_amount,
      refund.refund_method,
      refund.refund_date,
      `"${refund.reference_number || ''}"`,
      `"${refund.reason || ''}"`,
      refund.status,
      refund.created_at || '',
      refund.approved_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `refunds-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Refunds exported successfully', { variant: 'success' });
  };

  // Filter refunds
  const filteredRefunds = refunds.filter((refund) => {
    // Status filter
    if (filterStatus !== 'all' && refund.status !== filterStatus) return false;

    // Date range filter
    if (filterStartDate || filterEndDate) {
      const refundDate = new Date(refund.created_at);
      if (filterStartDate && refundDate < filterStartDate) return false;
      if (filterEndDate) {
        const endDatePlusOne = new Date(filterEndDate);
        endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
        if (refundDate >= endDatePlusOne) return false;
      }
    }

    // Search filter
    if (filterName) {
      const query = filterName.toLowerCase();
      const matchesSearch =
        refund.customer_name.toLowerCase().includes(query) ||
        refund.reason.toLowerCase().includes(query) ||
        (refund.reference_number && refund.reference_number.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Amount filter
    if (filterAmountOperator && filterAmountValue) {
      const amountValue = parseFloat(filterAmountValue);
      if (!isNaN(amountValue)) {
        const amount = Number(refund.refund_amount);
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

  const dataInPage = filteredRefunds.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const isNotFound = !loading && filteredRefunds.length === 0;

  return (
    <>
      <Head>
        <title>Refunds | Tiffin Management</title>
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

        {/* Analytics Cards */}
        <Card sx={{ mb: 5 }}>
          <Scrollbar>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2 }}
            >
              <RefundAnalytic
                title="Total"
                total={refunds.length}
                percent={100}
                price={sumBy(refunds, (r) => Number(r.refund_amount) || 0)}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <RefundAnalytic
                title="Pending"
                total={getStatusCount('pending')}
                percent={getPercentByStatus('pending')}
                price={getTotalAmountByStatus('pending')}
                icon="eva:clock-fill"
                color={theme.palette.warning.main}
              />

              <RefundAnalytic
                title="Completed"
                total={getStatusCount('completed')}
                percent={getPercentByStatus('completed')}
                price={getTotalAmountByStatus('completed')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
              />

              <RefundAnalytic
                title="Cancelled"
                total={getStatusCount('cancelled')}
                percent={getPercentByStatus('cancelled')}
                price={getTotalAmountByStatus('cancelled')}
                icon="eva:close-circle-fill"
                color={theme.palette.error.main}
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
          <RefundTableToolbar
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
                        emptyRows={emptyRows(page, rowsPerPage, filteredRefunds.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </TableBody>
                  </Table>
                </Scrollbar>
              </TableContainer>

              <TablePaginationCustom
                count={filteredRefunds.length}
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
