import { useState, useEffect, useCallback, useRef } from 'react';
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
  Typography,
  Box,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Divider,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import Iconify from '../../../components/iconify';
import Label from '../../../components/label';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import { fCurrency } from '../../../utils/formatNumber';
import { fDateTime } from '../../../utils/formatTime';
import {
  useTable,
  getComparator,
  TablePaginationCustom,
} from '../../../components/table';
import { InvoiceAnalytic, InvoiceTableToolbar } from '../../../sections/@dashboard/tiffin/invoice/list';

// ----------------------------------------------------------------------

// Helper function for sumBy
function sumBy<T>(array: T[], iteratee: (item: T) => number): number {
  return array.reduce((sum, item) => sum + iteratee(item), 0);
}

// ----------------------------------------------------------------------

interface Invoice {
  id: number;
  invoice_number: string;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
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
  } = useTable({ defaultOrderBy: 'generated_at', defaultOrder: 'desc' });

  const [tableData, setTableData] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterInvoiceType, setFilterInvoiceType] = useState('');
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');

  const fetchInvoices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/invoices', {
        params: { limit: 1000 }, // Get all invoices for client-side filtering
      });

      if (response.data.success) {
        setTableData(response.data.data || []);
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
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return tableData.length;
    return tableData.filter((invoice) => invoice.payment_status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(tableData, (invoice) => Number(invoice.total_amount) || 0);
    return sumBy(
      tableData.filter((invoice) => invoice.payment_status === status),
      (invoice) => Number(invoice.total_amount) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (tableData.length === 0) return 0;
    return (getStatusCount(status) / tableData.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: tableData.length },
    { value: 'unpaid', label: 'Unpaid', color: 'error', count: getStatusCount('unpaid') },
    { value: 'partial_paid', label: 'Partial Paid', color: 'warning', count: getStatusCount('partial_paid') },
    { value: 'paid', label: 'Paid', color: 'success', count: getStatusCount('paid') },
  ] as const;

  const handleFilterStatus = (event: React.SyntheticEvent<Element, Event>, newValue: string) => {
    setFilterStatus(newValue);
    setPage(0);
  };

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterName(event.target.value);
    setPage(0);
  };

  const handleFilterMonth = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterMonth(event.target.value);
    setPage(0);
  };

  const handleFilterInvoiceType = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterInvoiceType(event.target.value);
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
    setFilterMonth('');
    setFilterName('');
    setFilterInvoiceType('');
    setFilterAmountOperator('');
    setFilterAmountValue('');
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoices List</title>
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
          <h1>Invoices Report</h1>
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Month(s)</th>
                <th class="text-right">Amount</th>
                <th class="text-right">Paid</th>
                <th class="text-right">Balance</th>
                <th>Status</th>
                <th>Generated</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((invoice) => `
                <tr>
                  <td>${invoice.invoice_number}</td>
                  <td>${invoice.customer_name}</td>
                  <td>${invoice.invoice_type === 'combined' ? 'Combined' : 'Individual'}</td>
                  <td>${invoice.billing_months}</td>
                  <td class="text-right">$${Number(invoice.total_amount).toFixed(2)}</td>
                  <td class="text-right">$${Number(invoice.amount_paid).toFixed(2)}</td>
                  <td class="text-right">$${Number(invoice.balance_due).toFixed(2)}</td>
                  <td>${getStatusLabel(invoice.payment_status)}</td>
                  <td>${new Date(invoice.generated_at).toLocaleDateString()}</td>
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

          if (cleanValues.length < 6) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const invoiceData = {
            customer_id: parseInt(cleanValues[1]) || 0,
            invoice_type: cleanValues[2] || 'individual',
            total_amount: parseFloat(cleanValues[3]) || 0,
            amount_paid: parseFloat(cleanValues[4]) || 0,
            payment_status: cleanValues[5] || 'unpaid',
            billing_months: cleanValues[6] || '',
          };

          if (!invoiceData.customer_id || !invoiceData.total_amount) {
            errorCount++;
            errors.push(`Line skipped: missing required fields`);
            continue;
          }

          await axios.post('/api/invoices', invoiceData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} invoice(s) successfully`, { variant: 'success' });
        fetchInvoices();
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} record(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import invoices', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'Invoice ID',
      'Invoice Number',
      'Customer ID',
      'Customer Name',
      'Invoice Type',
      'Total Amount',
      'Amount Paid',
      'Balance Due',
      'Payment Status',
      'Billing Months',
      'Order Count',
      'Generated At',
      'Due Date',
    ];

    const csvData = dataFiltered.map((invoice) => [
      invoice.id,
      `"${invoice.invoice_number || ''}"`,
      invoice.customer_id,
      `"${invoice.customer_name || ''}"`,
      invoice.invoice_type,
      invoice.total_amount,
      invoice.amount_paid,
      invoice.balance_due,
      invoice.payment_status,
      `"${invoice.billing_months || ''}"`,
      invoice.order_count,
      invoice.generated_at || '',
      invoice.due_date || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `invoices-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Invoices exported successfully', { variant: 'success' });
  };

  // Filter data
  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterStatus,
    filterMonth,
    filterName,
    filterInvoiceType,
    filterAmountOperator,
    filterAmountValue,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // Get unique months for filter
  const uniqueMonths = Array.from(
    new Set(
      tableData.flatMap((row) =>
        row.billing_months ? row.billing_months.split(', ') : []
      )
    )
  ).sort((a, b) => b.localeCompare(a));

  const isFiltered =
    filterStatus !== 'all' ||
    filterMonth !== '' ||
    filterName !== '' ||
    filterInvoiceType !== '' ||
    filterAmountOperator !== '';

  return (
    <>
      <Head>
        <title>Invoices | Tiffin Management</title>
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
          heading="Invoices"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Invoices' },
          ]}
        />

        {/* Analytics Cards */}
        <Card sx={{ mb: 5 }}>
          <Scrollbar>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2 }}
            >
              <InvoiceAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={getTotalAmountByStatus('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <InvoiceAnalytic
                title="Unpaid"
                total={getStatusCount('unpaid')}
                percent={getPercentByStatus('unpaid')}
                price={getTotalAmountByStatus('unpaid')}
                icon="eva:clock-fill"
                color={theme.palette.error.main}
              />

              <InvoiceAnalytic
                title="Partial Paid"
                total={getStatusCount('partial_paid')}
                percent={getPercentByStatus('partial_paid')}
                price={getTotalAmountByStatus('partial_paid')}
                icon="eva:checkmark-outline"
                color={theme.palette.warning.main}
              />

              <InvoiceAnalytic
                title="Paid"
                total={getStatusCount('paid')}
                percent={getPercentByStatus('paid')}
                price={getTotalAmountByStatus('paid')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
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
          <InvoiceTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterMonth={filterMonth}
            filterInvoiceType={filterInvoiceType}
            filterAmountOperator={filterAmountOperator}
            filterAmountValue={filterAmountValue}
            monthOptions={uniqueMonths}
            onFilterName={handleFilterName}
            onFilterMonth={handleFilterMonth}
            onFilterInvoiceType={handleFilterInvoiceType}
            onFilterAmountOperator={handleFilterAmountOperator}
            onFilterAmountValue={handleFilterAmountValue}
            onResetFilter={handleResetFilter}
            onPrint={handlePrint}
            onImport={handleImport}
            onExport={handleExport}
          />

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
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
                  ) : dataInPage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No invoices found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataInPage.map((invoice) => (
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
                          <Stack spacing={0.5}>
                            <Typography variant="body2">{invoice.customer_name}</Typography>
                            {invoice.customer_phone && (
                              <Typography variant="caption" color="text.secondary">
                                {invoice.customer_phone}
                              </Typography>
                            )}
                          </Stack>
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
            </Scrollbar>
          </TableContainer>

          <TablePaginationCustom
            count={dataFiltered.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={onChangePage}
            onRowsPerPageChange={onChangeRowsPerPage}
            dense={dense}
            onChangeDense={onChangeDense}
          />
        </Card>
      </Container>
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({
  inputData,
  comparator,
  filterStatus,
  filterMonth,
  filterName,
  filterInvoiceType,
  filterAmountOperator,
  filterAmountValue,
}: {
  inputData: Invoice[];
  comparator: (a: any, b: any) => number;
  filterStatus: string;
  filterMonth: string;
  filterName: string;
  filterInvoiceType: string;
  filterAmountOperator: string;
  filterAmountValue: string;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilizedThis.map((el) => el[0]);

  // Filter by status
  if (filterStatus !== 'all') {
    data = data.filter((row) => row.payment_status === filterStatus);
  }

  // Filter by month
  if (filterMonth) {
    data = data.filter((row) => row.billing_months && row.billing_months.includes(filterMonth));
  }

  // Filter by name/phone search
  if (filterName) {
    const searchLower = filterName.toLowerCase();
    data = data.filter(
      (row) =>
        row.customer_name.toLowerCase().includes(searchLower) ||
        row.invoice_number.toLowerCase().includes(searchLower) ||
        (row.customer_phone && row.customer_phone.toLowerCase().includes(searchLower))
    );
  }

  // Filter by invoice type
  if (filterInvoiceType) {
    data = data.filter((row) => row.invoice_type === filterInvoiceType);
  }

  // Filter by amount
  if (filterAmountOperator && filterAmountValue) {
    const amountValue = parseFloat(filterAmountValue);
    if (!isNaN(amountValue)) {
      data = data.filter((row) => {
        const amount = Number(row.total_amount);
        switch (filterAmountOperator) {
          case '>':
            return amount > amountValue;
          case '>=':
            return amount >= amountValue;
          case '<':
            return amount < amountValue;
          case '<=':
            return amount <= amountValue;
          case '==':
            return amount === amountValue;
          default:
            return true;
        }
      });
    }
  }

  return data;
}
