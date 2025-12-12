import { useState, useEffect } from 'react';
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
import {
  useTable,
  getComparator,
  TablePaginationCustom,
} from '../../../components/table';

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
              <Tab key={tab} label={tab} value={tab} />
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
    data = data.filter((row) => row.status === filterStatus);
  }

  if (filterMonth) {
    data = data.filter((row) => row.billing_month === filterMonth);
  }

  return data;
}
