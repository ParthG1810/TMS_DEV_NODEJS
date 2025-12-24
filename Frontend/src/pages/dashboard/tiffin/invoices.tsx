import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Card,
  Container,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  TextField,
  MenuItem,
  IconButton,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import Iconify from '../../../components/iconify';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import { fCurrency } from '../../../utils/formatNumber';
import { fDateTime } from '../../../utils/formatTime';

// ----------------------------------------------------------------------

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  invoice_type: 'individual' | 'combined';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial_paid' | 'paid';
  generated_at: string;
  generated_by: string | null;
  due_date: string | null;
  order_count: number;
  billing_months: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ----------------------------------------------------------------------

InvoicesPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function InvoicesPage() {
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [invoiceType, setInvoiceType] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (paymentStatus) params.payment_status = paymentStatus;
      if (invoiceType) params.invoice_type = invoiceType;
      if (selectedMonth) {
        params.billing_month = `${selectedMonth.getFullYear()}-${String(
          selectedMonth.getMonth() + 1
        ).padStart(2, '0')}`;
      }

      const response = await axios.get('/api/invoices', { params });

      if (response.data.success) {
        setInvoices(response.data.data);
        setPagination(response.data.pagination);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoices', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching invoices:', error);
      enqueueSnackbar(error.message || 'Failed to load invoices', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, paymentStatus, invoiceType, selectedMonth, enqueueSnackbar]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPagination((prev) => ({ ...prev, page: newPage + 1 }));
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPagination((prev) => ({ ...prev, page: 1, limit: parseInt(event.target.value, 10) }));
  };

  const handleViewInvoice = (id: number) => {
    router.push(`${PATH_DASHBOARD.tiffin.invoices}/${id}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'success';
      case 'partial_paid':
        return 'warning';
      case 'unpaid':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'partial_paid':
        return 'Partial';
      case 'unpaid':
        return 'Unpaid';
      default:
        return status;
    }
  };

  const handleClearFilters = () => {
    setPaymentStatus('');
    setInvoiceType('');
    setSelectedMonth(null);
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  return (
    <>
      <Head>
        <title>Invoices | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="Invoices"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Invoices' },
          ]}
        />

        <Card>
          {/* Filters */}
          <Box sx={{ p: 2 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={2}
              alignItems={{ sm: 'center' }}
            >
              <TextField
                select
                label="Payment Status"
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="unpaid">Unpaid</MenuItem>
                <MenuItem value="partial_paid">Partial Paid</MenuItem>
                <MenuItem value="paid">Paid</MenuItem>
              </TextField>

              <TextField
                select
                label="Invoice Type"
                value={invoiceType}
                onChange={(e) => {
                  setInvoiceType(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                size="small"
                sx={{ minWidth: 150 }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
                <MenuItem value="combined">Combined</MenuItem>
              </TextField>

              <DatePicker
                label="Billing Month"
                value={selectedMonth}
                onChange={(newValue) => {
                  setSelectedMonth(newValue);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                views={['year', 'month']}
                renderInput={(params) => (
                  <TextField {...params} size="small" sx={{ minWidth: 150 }} />
                )}
              />

              {(paymentStatus || invoiceType || selectedMonth) && (
                <Button
                  size="small"
                  color="inherit"
                  onClick={handleClearFilters}
                  startIcon={<Iconify icon="solar:close-circle-bold" />}
                >
                  Clear
                </Button>
              )}

              <Box sx={{ flexGrow: 1 }} />

              <Typography variant="body2" color="text.secondary">
                {pagination.total} invoice(s)
              </Typography>
            </Stack>
          </Box>

          {/* Table */}
          <Scrollbar>
            <TableContainer sx={{ minWidth: 800 }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Invoice #</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Month(s)</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Paid</TableCell>
                    <TableCell align="right">Balance</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell>Generated</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <CircularProgress size={32} />
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No invoices found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => handleViewInvoice(invoice.id)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {invoice.invoice_number}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{invoice.customer_name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={invoice.invoice_type === 'combined' ? 'Combined' : 'Individual'}
                            size="small"
                            variant="outlined"
                            color={invoice.invoice_type === 'combined' ? 'primary' : 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{invoice.billing_months}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {fCurrency(invoice.total_amount)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            color={invoice.amount_paid > 0 ? 'success.main' : 'text.secondary'}
                          >
                            {fCurrency(invoice.amount_paid)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                          >
                            {fCurrency(invoice.balance_due)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={getStatusLabel(invoice.payment_status)}
                            size="small"
                            color={getStatusColor(invoice.payment_status) as any}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {fDateTime(invoice.generated_at)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewInvoice(invoice.id);
                              }}
                            >
                              <Iconify icon="solar:eye-bold" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Scrollbar>

          {/* Pagination */}
          <TablePagination
            component="div"
            count={pagination.total}
            page={pagination.page - 1}
            onPageChange={handleChangePage}
            rowsPerPage={pagination.limit}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[10, 20, 50, 100]}
          />
        </Card>
      </Container>
    </>
  );
}
