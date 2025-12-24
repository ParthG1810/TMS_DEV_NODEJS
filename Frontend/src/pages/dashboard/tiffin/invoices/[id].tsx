import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
  Card,
  Container,
  Grid,
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import DashboardLayout from '../../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../../components/custom-breadcrumbs';
import Iconify from '../../../../components/iconify';
import { PATH_DASHBOARD } from '../../../../routes/paths';
import { useSettingsContext } from '../../../../components/settings';
import axios from '../../../../utils/axios';
import { useSnackbar } from '../../../../components/snackbar';
import { fCurrency } from '../../../../utils/formatNumber';
import { fDateTime, fDate } from '../../../../utils/formatTime';
import InvoicePDF from '../../../../sections/@dashboard/tiffin/invoice/InvoicePDF';

// ----------------------------------------------------------------------

interface OrderBillingDetail {
  id: number;
  order_id: number;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_plan_days: number;
  base_amount: number;
  extra_amount: number;
  total_amount: number;
  meal_plan_name: string;
  order_price: number;
  start_date: string;
  end_date: string;
}

interface PaymentRecord {
  id: number;
  amount_applied: number;
  applied_at: string;
  applied_by: string | null;
  payment_type: string;
  payment_source: string | null;
  reference_number: string | null;
}

interface InvoiceDetail {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  invoice_type: 'individual' | 'combined';
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  payment_status: 'unpaid' | 'partial_paid' | 'paid';
  generated_at: string;
  generated_by: string | null;
  due_date: string | null;
  notes: string | null;
  orders: OrderBillingDetail[];
  payments: PaymentRecord[];
}

// ----------------------------------------------------------------------

InvoiceDetailPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function InvoiceDetailPage() {
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const { id } = router.query;

  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Settings for PDF
  const [companyName, setCompanyName] = useState('TIFFIN MANAGEMENT SYSTEM');
  const [eTransferEmail, setETransferEmail] = useState('admin@tiffinservice.com');
  const [logoDataUrl, setLogoDataUrl] = useState('');

  useEffect(() => {
    if (id) {
      fetchInvoice();
      fetchSettings();
    }
  }, [id]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/invoices/${id}`);

      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoice', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching invoice:', error);
      enqueueSnackbar(error.message || 'Failed to load invoice', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get('/api/settings');
      if (response.data.success) {
        setETransferEmail(response.data.data.etransfer_email || 'admin@tiffinservice.com');
        setCompanyName(response.data.data.company_name || 'TIFFIN MANAGEMENT SYSTEM');

        const logoUrl = response.data.data.company_logo || '';
        if (logoUrl) {
          try {
            const logoResponse = await axios.get('/api/settings/logo');
            if (logoResponse.data.success) {
              setLogoDataUrl(logoResponse.data.data.dataUrl);
            }
          } catch (error) {
            console.error('Error fetching logo:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      setDeleting(true);
      const response = await axios.delete(`/api/invoices/${id}`);

      if (response.data.success) {
        enqueueSnackbar('Invoice deleted successfully', { variant: 'success' });
        // Redirect to billing calendar with the customer's month
        if (invoice && invoice.orders.length > 0) {
          const firstOrder = invoice.orders[0];
          router.push({
            pathname: PATH_DASHBOARD.tiffin.billingCalendar,
            query: {
              month: firstOrder.billing_month,
            },
          });
        } else {
          router.push(PATH_DASHBOARD.tiffin.billingCalendar);
        }
      } else {
        enqueueSnackbar(response.data.error || 'Failed to delete invoice', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error deleting invoice:', error);
      enqueueSnackbar(error.response?.data?.error || error.message || 'Failed to delete invoice', { variant: 'error' });
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
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
        return 'Partial Paid';
      case 'unpaid':
        return 'Unpaid';
      default:
        return status;
    }
  };

  const formatMonth = (month: string) => {
    const [year, m] = month.split('-');
    const date = new Date(parseInt(year), parseInt(m) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!invoice) {
    return (
      <Container maxWidth={themeStretch ? false : 'lg'}>
        <Alert severity="error">Invoice not found</Alert>
      </Container>
    );
  }

  return (
    <>
      <Head>
        <title>{invoice.invoice_number} | Invoice</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading={invoice.invoice_number}
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Invoices', href: PATH_DASHBOARD.tiffin.invoices },
            { name: invoice.invoice_number },
          ]}
          action={
            <Stack direction="row" spacing={1}>
              {invoice.payment_status === 'unpaid' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:eye-bold" />}
                onClick={() => setShowPdfPreview(true)}
              >
                Preview PDF
              </Button>
              <PDFDownloadLink
                document={
                  <InvoicePDF
                    invoice={invoice}
                    companyName={companyName}
                    eTransferEmail={eTransferEmail}
                    companyLogo={logoDataUrl}
                  />
                }
                fileName={`${invoice.invoice_number}.pdf`}
                style={{ textDecoration: 'none' }}
              >
                {({ loading: pdfLoading }) => (
                  <Button
                    variant="contained"
                    startIcon={
                      pdfLoading ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <Iconify icon="solar:download-bold" />
                      )
                    }
                    disabled={pdfLoading}
                  >
                    Download PDF
                  </Button>
                )}
              </PDFDownloadLink>
            </Stack>
          }
        />

        <Grid container spacing={3}>
          {/* Invoice Summary */}
          <Grid item xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              {/* Header */}
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ sm: 'center' }}
                sx={{ mb: 3 }}
              >
                <Box>
                  <Typography variant="h4">{invoice.invoice_number}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Generated on {fDateTime(invoice.generated_at)}
                    {invoice.generated_by && ` by ${invoice.generated_by}`}
                  </Typography>
                </Box>
                <Chip
                  label={getStatusLabel(invoice.payment_status)}
                  color={getStatusColor(invoice.payment_status) as any}
                  size="medium"
                />
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Customer Info */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Bill To
                  </Typography>
                  <Typography variant="h6">{invoice.customer_name}</Typography>
                  <Typography variant="body2">{invoice.customer_phone || 'No phone'}</Typography>
                  <Typography variant="body2">{invoice.customer_address || 'No address'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Invoice Details
                  </Typography>
                  <Typography variant="body2">
                    <strong>Type:</strong>{' '}
                    {invoice.invoice_type === 'combined' ? 'Combined' : 'Individual'}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Orders:</strong> {invoice.orders.length}
                  </Typography>
                  {invoice.due_date && (
                    <Typography variant="body2">
                      <strong>Due Date:</strong> {fDate(invoice.due_date)}
                    </Typography>
                  )}
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* Orders Table */}
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Included Orders
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Meal Plan</TableCell>
                      <TableCell>Month</TableCell>
                      <TableCell align="center">Delivered</TableCell>
                      <TableCell align="center">Absent</TableCell>
                      <TableCell align="center">Extra</TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {invoice.orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {order.meal_plan_name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Order #{order.order_id}
                          </Typography>
                        </TableCell>
                        <TableCell>{formatMonth(order.billing_month)}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={order.total_delivered}
                            size="small"
                            sx={{
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: theme.palette.success.dark,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={order.total_absent}
                            size="small"
                            sx={{
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              color: theme.palette.error.dark,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={order.total_extra}
                            size="small"
                            sx={{
                              bgcolor: alpha(theme.palette.info.main, 0.1),
                              color: theme.palette.info.dark,
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight="medium">
                            {fCurrency(order.total_amount)}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell colSpan={5} align="right">
                        <Typography variant="subtitle1">Total</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="h6" color="primary.main">
                          {fCurrency(invoice.total_amount)}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Notes */}
              {invoice.notes && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Notes
                  </Typography>
                  <Typography variant="body2">{invoice.notes}</Typography>
                </Box>
              )}
            </Card>
          </Grid>

          {/* Payment Summary */}
          <Grid item xs={12} md={4}>
            <Card sx={{ p: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Payment Summary
              </Typography>

              <Stack spacing={2}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Total Amount
                  </Typography>
                  <Typography variant="h6">{fCurrency(invoice.total_amount)}</Typography>
                </Box>

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Amount Paid
                  </Typography>
                  <Typography variant="body1" color="success.main">
                    {fCurrency(invoice.amount_paid)}
                  </Typography>
                </Box>

                <Divider />

                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Typography variant="subtitle1">Balance Due</Typography>
                  <Typography
                    variant="h5"
                    color={invoice.balance_due > 0 ? 'error.main' : 'success.main'}
                    fontWeight="bold"
                  >
                    {fCurrency(invoice.balance_due)}
                  </Typography>
                </Box>
              </Stack>

              {/* Payment History */}
              {invoice.payments.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Payment History
                  </Typography>
                  <Stack spacing={1}>
                    {invoice.payments.map((payment) => (
                      <Paper
                        key={payment.id}
                        variant="outlined"
                        sx={{ p: 1.5 }}
                      >
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {fCurrency(payment.amount_applied)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {fDateTime(payment.applied_at)}
                            </Typography>
                          </Box>
                          <Chip
                            label={payment.payment_source ? `${payment.payment_type} (${payment.payment_source})` : payment.payment_type}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* PDF Preview Dialog */}
      <Dialog
        open={showPdfPreview}
        onClose={() => setShowPdfPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">Invoice Preview</Typography>
            <IconButton onClick={() => setShowPdfPreview(false)}>
              <Iconify icon="solar:close-circle-bold" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ height: '70vh' }}>
          <PDFViewer width="100%" height="100%" style={{ border: 'none' }}>
            <InvoicePDF
              invoice={invoice}
              companyName={companyName}
              eTransferEmail={eTransferEmail}
              companyLogo={logoDataUrl}
            />
          </PDFViewer>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
        <DialogTitle>Delete Invoice</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete invoice <strong>{invoice.invoice_number}</strong>?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            This will unlink the order billings and allow them to be added to a new invoice.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteConfirm(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteInvoice}
            color="error"
            variant="contained"
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Iconify icon="solar:trash-bin-trash-bold" />
              )
            }
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
