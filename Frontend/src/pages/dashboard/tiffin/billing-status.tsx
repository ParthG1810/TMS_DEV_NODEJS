import { useState, useEffect, useRef } from 'react';
import sumBy from 'lodash/sumBy';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material/styles';
import {
  Tab,
  Tabs,
  Card,
  Container,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Stack,
} from '@mui/material';
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
import {
  useTable,
  getComparator,
  TablePaginationCustom,
} from '../../../components/table';
import { BillingStatusAnalytic, BillingStatusTableToolbar } from '../../../sections/@dashboard/tiffin/billing/list';

// ----------------------------------------------------------------------

interface BillingRecord {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string | null;
  customer_address: string;
  billing_month: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_amount: number;
  status: string;
  finalized_at: Date | null;
  finalized_by: string | null;
  paid_at: Date | null;
  payment_method: string | null;
  created_at: Date;
  updated_at: Date;
}

// ----------------------------------------------------------------------

BillingStatusPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function BillingStatusPage() {
  const router = useRouter();
  const theme = useTheme();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    setPage,
    onSort,
    onChangeDense,
    onChangePage,
    onChangeRowsPerPage,
  } = useTable({ defaultOrderBy: 'billing_month', defaultOrder: 'desc' });

  const [tableData, setTableData] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterName, setFilterName] = useState('');
  const [filterAmountOperator, setFilterAmountOperator] = useState('');
  const [filterAmountValue, setFilterAmountValue] = useState('');
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBillingRecords();
  }, []);

  const fetchBillingRecords = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/monthly-billing');
      if (response.data.success) {
        setTableData(response.data.data || []);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load billing records', {
          variant: 'error',
        });
      }
    } catch (error: any) {
      console.error('Error fetching billing records:', error);
      enqueueSnackbar(error.message || 'Failed to load billing records', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return tableData.length;
    return tableData.filter((record) => record.status === status).length;
  };

  const getTotalAmountByStatus = (status: string) => {
    if (status === 'all') return sumBy(tableData, (record) => Number(record.total_amount) || 0);
    return sumBy(
      tableData.filter((record) => record.status === status),
      (record) => Number(record.total_amount) || 0
    );
  };

  const getPercentByStatus = (status: string) => {
    if (tableData.length === 0) return 0;
    return (getStatusCount(status) / tableData.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: tableData.length },
    { value: 'calculating', label: 'Calculating', color: 'default', count: getStatusCount('calculating') },
    { value: 'pending', label: 'Pending', color: 'warning', count: getStatusCount('pending') },
    { value: 'finalized', label: 'Finalized', color: 'info', count: getStatusCount('finalized') },
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
    setFilterAmountOperator('');
    setFilterAmountValue('');
  };

  const handleViewDetails = (billingId: number) => {
    router.push(PATH_DASHBOARD.tiffin.billingDetails(billingId.toString()));
  };

  const handleApprove = async (billing: BillingRecord) => {
    try {
      const response = await axios.put(`/api/monthly-billing/${billing.id}`, {
        status: 'finalized',
      });
      if (response.data.success) {
        enqueueSnackbar('Billing approved successfully', { variant: 'success' });
        fetchBillingRecords();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to approve billing', { variant: 'error' });
    }
  };

  const handleReject = async (billing: BillingRecord) => {
    try {
      const response = await axios.put(`/api/monthly-billing/${billing.id}`, {
        status: 'calculating',
      });
      if (response.data.success) {
        enqueueSnackbar('Billing rejected', { variant: 'success' });
        fetchBillingRecords();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to reject billing', { variant: 'error' });
    }
  };

  const handleMarkAsPaid = async (billing: BillingRecord) => {
    try {
      const response = await axios.put(`/api/monthly-billing/${billing.id}`, {
        status: 'paid',
      });
      if (response.data.success) {
        enqueueSnackbar('Billing marked as paid', { variant: 'success' });
        fetchBillingRecords();
      }
    } catch (error: any) {
      enqueueSnackbar(error.message || 'Failed to mark as paid', { variant: 'error' });
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Billing Status</title>
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
          <h1>Billing Status Report</h1>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Billing Month</th>
                <th class="text-center">Delivered</th>
                <th class="text-center">Absent</th>
                <th class="text-center">Extra</th>
                <th class="text-right">Total Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((record) => `
                <tr>
                  <td>${record.customer_name}</td>
                  <td>${record.customer_phone || '-'}</td>
                  <td>${record.billing_month}</td>
                  <td class="text-center">${record.total_delivered}</td>
                  <td class="text-center">${record.total_absent}</td>
                  <td class="text-center">${record.total_extra}</td>
                  <td class="text-right">$${Number(record.total_amount).toFixed(2)}</td>
                  <td>${record.status}</td>
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

          if (cleanValues.length < 8) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const billingData = {
            customer_id: parseInt(cleanValues[1]) || 0,
            billing_month: cleanValues[3] || '',
            total_delivered: parseInt(cleanValues[4]) || 0,
            total_absent: parseInt(cleanValues[5]) || 0,
            total_extra: parseInt(cleanValues[6]) || 0,
            total_amount: parseFloat(cleanValues[7]) || 0,
            status: cleanValues[8] || 'calculating',
          };

          if (!billingData.customer_id || !billingData.billing_month) {
            errorCount++;
            errors.push(`Line skipped: missing required fields`);
            continue;
          }

          await axios.post('/api/monthly-billing', billingData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} billing record(s) successfully`, { variant: 'success' });
        fetchBillingRecords();
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} record(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import billing records', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'ID',
      'Customer ID',
      'Customer Name',
      'Billing Month',
      'Total Delivered',
      'Total Absent',
      'Total Extra',
      'Total Amount',
      'Status',
      'Finalized At',
      'Paid At',
      'Payment Method',
      'Created At',
      'Updated At',
    ];

    const csvData = dataFiltered.map((record) => [
      record.id,
      record.customer_id,
      `"${record.customer_name || ''}"`,
      record.billing_month,
      record.total_delivered,
      record.total_absent,
      record.total_extra,
      record.total_amount,
      record.status,
      record.finalized_at || '',
      record.paid_at || '',
      record.payment_method || '',
      record.created_at || '',
      record.updated_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `billing-status-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Billing records exported successfully', { variant: 'success' });
  };

  // Filter data
  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterStatus,
    filterMonth,
    filterName,
    filterAmountOperator,
    filterAmountValue,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const denseHeight = dense ? 52 : 72;

  // Get unique months for filter
  const uniqueMonths = Array.from(new Set(tableData.map((row) => row.billing_month))).sort(
    (a, b) => b.localeCompare(a)
  );

  const isFiltered =
    filterStatus !== 'all' ||
    filterMonth !== '' ||
    filterName !== '' ||
    filterAmountOperator !== '';

  const statusColor = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'pending':
        return 'info';
      case 'finalized':
        return 'success';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <>
      <Head>
        <title>Billing Status | Tiffin Management</title>
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
          heading="Billing Status"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Billing Status' },
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
              <BillingStatusAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={getTotalAmountByStatus('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <BillingStatusAnalytic
                title="Calculating"
                total={getStatusCount('calculating')}
                percent={getPercentByStatus('calculating')}
                price={getTotalAmountByStatus('calculating')}
                icon="eva:refresh-outline"
                color={theme.palette.text.secondary}
              />

              <BillingStatusAnalytic
                title="Pending"
                total={getStatusCount('pending')}
                percent={getPercentByStatus('pending')}
                price={getTotalAmountByStatus('pending')}
                icon="eva:clock-fill"
                color={theme.palette.warning.main}
              />

              <BillingStatusAnalytic
                title="Finalized"
                total={getStatusCount('finalized')}
                percent={getPercentByStatus('finalized')}
                price={getTotalAmountByStatus('finalized')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.info.main}
              />

              <BillingStatusAnalytic
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
          <BillingStatusTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterMonth={filterMonth}
            filterAmountOperator={filterAmountOperator}
            filterAmountValue={filterAmountValue}
            monthOptions={uniqueMonths}
            onFilterName={handleFilterName}
            onFilterMonth={handleFilterMonth}
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
                    <TableCell>Customer</TableCell>
                    <TableCell>Billing Month</TableCell>
                    <TableCell align="center">Delivered</TableCell>
                    <TableCell align="center">Absent</TableCell>
                    <TableCell align="center">Extra</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : dataInPage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        No billing records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataInPage.map((row) => (
                      <TableRow hover key={row.id}>
                        <TableCell>
                          <Stack spacing={0.5}>
                            <strong>{row.customer_name}</strong>
                            {row.customer_phone && (
                              <span style={{ fontSize: '0.875rem', color: 'text.secondary' }}>
                                {row.customer_phone}
                              </span>
                            )}
                          </Stack>
                        </TableCell>
                        <TableCell>{row.billing_month}</TableCell>
                        <TableCell align="center">{row.total_delivered}</TableCell>
                        <TableCell align="center">{row.total_absent}</TableCell>
                        <TableCell align="center">{row.total_extra}</TableCell>
                        <TableCell align="right">
                          <strong>{fCurrency(row.total_amount)}</strong>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={row.status}
                            color={statusColor(row.status)}
                            size="small"
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                            <Tooltip title="View Details">
                              <IconButton
                                size="small"
                                onClick={() => handleViewDetails(row.id)}
                              >
                                <Iconify icon="eva:eye-outline" />
                              </IconButton>
                            </Tooltip>

                            {row.status === 'pending' && (
                              <>
                                <Tooltip title="Approve">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleApprove(row)}
                                  >
                                    <Iconify icon="eva:checkmark-circle-2-outline" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Reject">
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleReject(row)}
                                  >
                                    <Iconify icon="eva:close-circle-outline" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}

                            {row.status === 'finalized' && (
                              <Tooltip title="Mark as Paid">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleMarkAsPaid(row)}
                                >
                                  <Iconify icon="eva:credit-card-outline" />
                                </IconButton>
                              </Tooltip>
                            )}

                            {row.status === 'calculating' && (
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    router.push(
                                      `${PATH_DASHBOARD.tiffin.billingCalendar}?month=${row.billing_month}`
                                    )
                                  }
                                >
                                  <Iconify icon="eva:calendar-outline" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
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
  filterAmountOperator,
  filterAmountValue,
}: {
  inputData: BillingRecord[];
  comparator: (a: any, b: any) => number;
  filterStatus: string;
  filterMonth: string;
  filterName: string;
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
    data = data.filter((row) => row.status === filterStatus);
  }

  // Filter by month
  if (filterMonth) {
    data = data.filter((row) => row.billing_month === filterMonth);
  }

  // Filter by name/phone search
  if (filterName) {
    const searchLower = filterName.toLowerCase();
    data = data.filter(
      (row) =>
        row.customer_name.toLowerCase().includes(searchLower) ||
        (row.customer_phone && row.customer_phone.toLowerCase().includes(searchLower))
    );
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
