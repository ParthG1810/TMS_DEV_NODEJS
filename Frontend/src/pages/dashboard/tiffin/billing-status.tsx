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
import { alpha } from '@mui/material/styles';
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
import {
  useTable,
  getComparator,
  TablePaginationCustom,
} from '../../../components/table';

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

const STATUS_OPTIONS = ['all', 'calculating', 'pending', 'finalized', 'paid'];

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
  const uniqueMonths = Array.from(new Set(tableData.map((row) => row.billing_month))).sort(
    (a, b) => b.localeCompare(a)
  );

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'Calculating';
      case 'pending':
        return 'Pending';
      case 'finalized':
        return 'Invoiced';
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
              <Tab key={tab} label={tab} value={tab} sx={{ textTransform: 'capitalize' }} />
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
                                <IconButton
                                  size="small"
                                  onClick={() => handleToggleExpand(row.id)}
                                >
                                  <Iconify
                                    icon={isExpanded ? 'eva:arrow-ios-downward-fill' : 'eva:arrow-ios-forward-fill'}
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
                                <Tooltip title="View Details">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewDetails(row.id)}
                                  >
                                    <Iconify icon="eva:eye-outline" />
                                  </IconButton>
                                </Tooltip>

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

                                {displayStatus === 'finalized' && (
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
                                      bgcolor: (theme) => alpha(theme.palette.primary.lighter, 0.3),
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
                                              <Stack direction="row" alignItems="center" spacing={1}>
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
                                                {formatDateRange(orderItem.start_date, orderItem.end_date)}
                                              </Typography>
                                            </TableCell>
                                            <TableCell align="center">{orderItem.total_delivered}</TableCell>
                                            <TableCell align="center">{orderItem.total_absent}</TableCell>
                                            <TableCell align="center">{orderItem.total_extra}</TableCell>
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
