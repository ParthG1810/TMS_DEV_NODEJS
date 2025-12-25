import { useState, useEffect, Fragment } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
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
  Button,
  Stack,
  MenuItem,
  TextField,
  Collapse,
  Box,
  Typography,
} from '@mui/material';
import DashboardLayout from '../../../layouts/dashboard';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import Iconify from '../../../components/iconify';
import { PATH_DASHBOARD } from '../../../routes/paths';
import { useSettingsContext } from '../../../components/settings';
import axios from '../../../utils/axios';
import { useSnackbar } from '../../../components/snackbar';
import { fCurrency } from '../../../utils/formatNumber';
import { fDate } from '../../../utils/formatTime';
import { useTable, getComparator, TablePaginationCustom } from '../../../components/table';

// ----------------------------------------------------------------------

interface OrderDetail {
  id: number;
  order_id: number;
  meal_plan_name: string;
  start_date: string;
  end_date: string;
  total_delivered: number;
  total_absent: number;
  total_extra: number;
  total_amount: number;
  status: string;
  finalized_at: Date | null;
}

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
  effective_status?: string;
  finalized_at: Date | null;
  finalized_by: string | null;
  paid_at: Date | null;
  payment_method: string | null;
  created_at: Date;
  updated_at: Date;
  orders?: OrderDetail[];
}

const STATUS_OPTIONS = ['all', 'calculating', 'pending', 'finalized', 'partial_paid', 'paid'];

// ----------------------------------------------------------------------

BillingStatusPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

// ----------------------------------------------------------------------

export default function BillingStatusPage() {
  const router = useRouter();
  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    onSort,
    onChangeDense,
    onChangePage,
    onChangeRowsPerPage,
  } = useTable({ defaultOrderBy: 'billing_month', defaultOrder: 'desc' });

  const [tableData, setTableData] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMonth, setFilterMonth] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

  const handleFilterStatus = (event: React.SyntheticEvent<Element, Event>, newValue: string) => {
    setFilterStatus(newValue);
    onChangePage(null as any, 0);
  };

  const handleToggleExpand = (billingId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(billingId)) {
        newSet.delete(billingId);
      } else {
        newSet.add(billingId);
      }
      return newSet;
    });
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
              ${dataFiltered
                .map(
                  (record) => `
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
              `
                )
                .join('')}
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
        enqueueSnackbar(`Imported ${successCount} billing record(s) successfully`, {
          variant: 'success',
        });
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

    const csvContent = [headers.join(','), ...csvData.map((row) => row.join(','))].join('\n');

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
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const denseHeight = dense ? 52 : 72;

  // Get unique months for filter
  const uniqueMonths = Array.from(new Set(tableData.map((row) => row.billing_month))).sort((a, b) =>
    b.localeCompare(a)
  );

  const statusColor = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'pending':
        return 'info';
      case 'finalized':
        return 'success';
      case 'partial_paid':
        return 'primary';
      case 'paid':
        return 'success';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'Calculating';
      case 'pending':
        return 'Pending Approval';
      case 'finalized':
        return 'Invoiced';
      case 'partial_paid':
        return 'Partial Paid';
      case 'paid':
        return 'Paid';
      default:
        return status;
    }
  };

  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.toLocaleString('default', { month: 'short' });
    return `${month} ${startDay}-${endDay}`;
  };

  return (
    <>
      <Head>
        <title>Billing Status | Tiffin Management</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'xl'}>
        <CustomBreadcrumbs
          heading="Billing Status"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Billing Status' },
          ]}
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
              <Tab key={tab} label={tab === 'all' ? 'All' : getStatusLabel(tab)} value={tab} />
            ))}
          </Tabs>

          <Divider />

          {/* Filters */}
          <Stack
            spacing={2}
            direction={{ xs: 'column', sm: 'row' }}
            sx={{ p: 2.5, bgcolor: 'background.neutral' }}
          >
            <TextField
              select
              fullWidth
              label="Filter by Month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              SelectProps={{
                MenuProps: {
                  PaperProps: {
                    sx: { maxHeight: 240 },
                  },
                },
              }}
              sx={{ maxWidth: { sm: 240 } }}
            >
              <MenuItem value="">All Months</MenuItem>
              {uniqueMonths.map((month) => (
                <MenuItem key={month} value={month}>
                  {month}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Divider />

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }} />
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
                      <TableCell colSpan={9} align="center">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : dataInPage.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} align="center">
                        No billing records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    dataInPage.map((row) => {
                      const isExpanded = expandedRows.has(row.id);
                      const hasOrders = row.orders && row.orders.length > 0;
                      const displayStatus = row.effective_status || row.status;

                      return (
                        <Fragment key={row.id}>
                          <TableRow hover>
                            <TableCell sx={{ width: 40 }}>
                              {hasOrders && (
                                <IconButton size="small" onClick={() => handleToggleExpand(row.id)}>
                                  <Iconify
                                    icon={
                                      isExpanded
                                        ? 'eva:arrow-ios-downward-fill'
                                        : 'eva:arrow-ios-forward-fill'
                                    }
                                    width={18}
                                  />
                                </IconButton>
                              )}
                            </TableCell>
                            <TableCell>
                              <Stack spacing={0.5}>
                                <strong>{row.customer_name}</strong>
                                {row.customer_phone && (
                                  <Typography variant="caption" color="text.secondary">
                                    {row.customer_phone}
                                  </Typography>
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
                                label={getStatusLabel(displayStatus)}
                                color={statusColor(displayStatus)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                                {displayStatus === 'pending' && (
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

                                {displayStatus === 'calculating' && (
                                  <Tooltip title="View Calendar">
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

                                {displayStatus !== 'calculating' && (
                                  <>
                                    {hasOrders && row.orders && row.orders.length > 0 && (
                                      <Tooltip title="View Invoice">
                                        <IconButton
                                          size="small"
                                          onClick={() =>
                                            router.push(
                                              `/dashboard/tiffin/order-invoice-details?orderId=${
                                                row.orders![0].order_id
                                              }&month=${row.billing_month}`
                                            )
                                          }
                                        >
                                          <Iconify icon="eva:file-outline" />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                    <Tooltip title="View Combined Invoice">
                                      <IconButton
                                        size="small"
                                        onClick={() =>
                                          router.push(
                                            `/dashboard/tiffin/combined-invoice?customerId=${
                                              row.customer_id
                                            }&customerName=${encodeURIComponent(
                                              row.customer_name
                                            )}&month=${row.billing_month}`
                                          )
                                        }
                                      >
                                        <Iconify icon="eva:layers-outline" />
                                      </IconButton>
                                    </Tooltip>
                                  </>
                                )}
                              </Stack>
                            </TableCell>
                          </TableRow>

                          {/* Expandable child rows */}
                          {hasOrders && (
                            <TableRow>
                              <TableCell colSpan={9} sx={{ p: 0, border: 0 }}>
                                <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                                  <Box
                                    sx={{
                                      py: 1,
                                      px: 2,
                                      border: (theme) => `1px solid ${theme.palette.divider}`,
                                      borderRadius: 1,
                                      mx: 1,
                                      my: 0.5,
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow>
                                          <TableCell sx={{ pl: 4 }}>Meal Plan</TableCell>
                                          <TableCell>Period</TableCell>
                                          <TableCell align="center">Delivered</TableCell>
                                          <TableCell align="center">Absent</TableCell>
                                          <TableCell align="center">Extra</TableCell>
                                          <TableCell align="right">Amount</TableCell>
                                          <TableCell>Status</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {row.orders!.map((orderItem) => (
                                          <TableRow key={orderItem.id} hover>
                                            <TableCell sx={{ pl: 4 }}>
                                              <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                              >
                                                <Iconify
                                                  icon="eva:corner-down-right-outline"
                                                  width={16}
                                                  sx={{ color: 'text.secondary' }}
                                                />
                                                <Typography variant="body2">
                                                  {orderItem.meal_plan_name}
                                                </Typography>
                                              </Stack>
                                            </TableCell>
                                            <TableCell>
                                              <Typography variant="caption">
                                                {formatDateRange(
                                                  orderItem.start_date,
                                                  orderItem.end_date
                                                )}
                                              </Typography>
                                            </TableCell>
                                            <TableCell align="center">
                                              {orderItem.total_delivered}
                                            </TableCell>
                                            <TableCell align="center">
                                              {orderItem.total_absent}
                                            </TableCell>
                                            <TableCell align="center">
                                              {orderItem.total_extra}
                                            </TableCell>
                                            <TableCell align="right">
                                              {fCurrency(orderItem.total_amount)}
                                            </TableCell>
                                            <TableCell>
                                              <Chip
                                                label={getStatusLabel(orderItem.status)}
                                                color={statusColor(orderItem.status)}
                                                size="small"
                                                variant="outlined"
                                              />
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          )}
                        </Fragment>
                      );
                    })
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
}: {
  inputData: BillingRecord[];
  comparator: (a: any, b: any) => number;
  filterStatus: string;
  filterMonth: string;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  let data = stabilizedThis.map((el) => el[0]);

  if (filterStatus !== 'all') {
    data = data.filter((row) => {
      const displayStatus = row.effective_status || row.status;
      return displayStatus === filterStatus;
    });
  }

  if (filterMonth) {
    data = data.filter((row) => row.billing_month === filterMonth);
  }

  return data;
}
