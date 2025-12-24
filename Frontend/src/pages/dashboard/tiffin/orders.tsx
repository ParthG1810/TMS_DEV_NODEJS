import { useEffect, useState, useRef } from 'react';
import sumBy from 'lodash/sumBy';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
import { useTheme } from '@mui/material/styles';
import {
  Card,
  Table,
  Button,
  Tooltip,
  TableBody,
  Container,
  IconButton,
  TableContainer,
  Tabs,
  Tab,
  Box,
  Stack,
  Divider,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getCustomerOrders, deleteCustomerOrder } from '../../../redux/slices/customerOrder';
// @types
import { ICustomerOrder } from '../../../@types/tms';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import ConfirmDialog from '../../../components/confirm-dialog';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSnackbar } from '../../../components/snackbar';
import Label from '../../../components/label';
import {
  useTable,
  getComparator,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '../../../components/table';
// sections
import { OrderTableRow, OrderTableToolbar, OrderAnalytic } from '../../../sections/@dashboard/tiffin/order/list';
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'period', label: 'Period', align: 'left' },
  { id: 'quantity', label: 'Qty', align: 'center' },
  { id: 'selected_days', label: 'Days', align: 'left' },
  { id: 'price', label: 'Price', align: 'right' },
  { id: 'payment_status', label: 'Status', align: 'left' },
  { id: '' },
];

// ----------------------------------------------------------------------

OrdersPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function OrdersPage() {
  const theme = useTheme();

  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    setPage,
    selected,
    setSelected,
    onSelectRow,
    onSelectAllRows,
    onSort,
    onChangeDense,
    onChangePage,
    onChangeRowsPerPage,
  } = useTable();

  const { push } = useRouter();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const { orders, isLoading } = useSelector((state) => state.customerOrder);

  const [tableData, setTableData] = useState<ICustomerOrder[]>([]);
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | null>(null);
  const [filterEndDate, setFilterEndDate] = useState<Date | null>(null);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getCustomerOrders());
  }, [dispatch]);

  useEffect(() => {
    if (orders && orders.length) {
      setTableData(orders);
    }
  }, [orders]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
    filterStatus,
    filterStartDate,
    filterEndDate,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const denseHeight = dense ? 52 : 72;
  const isFiltered = filterName !== '' || filterStatus !== 'all' || filterStartDate !== null || filterEndDate !== null;
  const isNotFound = (!dataFiltered.length && isFiltered) || (!isLoading && !dataFiltered.length);

  // Calculate status counts
  const getStatusCount = (status: string) => {
    if (status === 'all') return tableData.length;
    return tableData.filter((order) => {
      const orderStatus = order.payment_status || 'calculating';
      return orderStatus === status;
    }).length;
  };

  const getTotalPriceByStatus = (status: string) => {
    if (status === 'all') return sumBy(tableData, (order) => Number(order.price) || 0);
    return sumBy(
      tableData.filter((order) => {
        const orderStatus = order.payment_status || 'calculating';
        return orderStatus === status;
      }),
      (order) => Number(order.price) || 0
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
    { value: 'partial_paid', label: 'Partial Paid', color: 'secondary', count: getStatusCount('partial_paid') },
  ] as const;

  const handleOpenConfirm = () => setOpenConfirm(true);
  const handleCloseConfirm = () => setOpenConfirm(false);

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const handleFilterStatus = (event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterStatus(newValue);
  };

  const handleFilterStartDate = (date: Date | null) => {
    setPage(0);
    setFilterStartDate(date);
  };

  const handleFilterEndDate = (date: Date | null) => {
    setPage(0);
    setFilterEndDate(date);
  };

  const handleDeleteRow = async (id: number) => {
    try {
      const result = await dispatch(deleteCustomerOrder(id));

      // Check if deletion was successful
      if (result && result.success === false) {
        enqueueSnackbar(result.error || 'Failed to delete order', { variant: 'error' });
        return;
      }

      const deleteRow = tableData.filter((row) => row.id !== id);
      setTableData(deleteRow);
      enqueueSnackbar('Delete success!');

      if (page > 0) {
        if (dataInPage.length < 2) {
          setPage(page - 1);
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.error || error.error || error.message || 'Failed to delete order';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleDeleteRows = async (selectedRows: number[]) => {
    try {
      // Check for locked orders (payment_status in 'pending', 'received', or 'paid')
      const lockedOrders = tableData.filter(
        (row) => selectedRows.includes(row.id) && row.payment_status && ['pending', 'received', 'paid'].includes(row.payment_status)
      );

      if (lockedOrders.length > 0) {
        const statusCounts = {
          pending: lockedOrders.filter(o => o.payment_status === 'pending').length,
          received: lockedOrders.filter(o => o.payment_status === 'received').length,
          paid: lockedOrders.filter(o => o.payment_status === 'paid').length,
        };
        const statusMsg = [
          statusCounts.pending > 0 && `${statusCounts.pending} pending approval`,
          statusCounts.received > 0 && `${statusCounts.received} approved awaiting payment`,
          statusCounts.paid > 0 && `${statusCounts.paid} paid`,
        ].filter(Boolean).join(', ');

        enqueueSnackbar(
          `Cannot delete ${lockedOrders.length} order(s): ${statusMsg}. Orders are locked.`,
          { variant: 'warning' }
        );
        return;
      }

      const results = await Promise.all(
        selectedRows.map((id) => dispatch(deleteCustomerOrder(id)))
      );

      // Check if any deletions failed
      const failed = results.filter((r: any) => r && r.success === false);
      if (failed.length > 0) {
        enqueueSnackbar(
          `Failed to delete ${failed.length} order(s). ${failed[0]?.error || ''}`,
          { variant: 'error' }
        );
        return;
      }

      const deleteRows = tableData.filter((row) => !selectedRows.includes(row.id));
      setTableData(deleteRows);
      setSelected([]);
      enqueueSnackbar('Delete success!');

      if (page > 0) {
        if (selectedRows.length === dataInPage.length) {
          setPage(page - 1);
        } else if (selectedRows.length === dataFiltered.length) {
          setPage(0);
        } else if (selectedRows.length > dataInPage.length) {
          const newPage = Math.ceil((tableData.length - selectedRows.length) / rowsPerPage) - 1;
          setPage(newPage);
        }
      }
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.error || error.error || error.message || 'Failed to delete orders';
      enqueueSnackbar(errorMsg, { variant: 'error' });
    }
  };

  const handleEditRow = (id: number) => {
    push(PATH_DASHBOARD.tiffin.orderEdit(String(id)));
  };

  const handleCalculateBilling = (customerId: number) => {
    // Get current month in YYYY-MM format
    const today = new Date();
    const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    push(`/dashboard/tiffin/billing-calendar?customer_id=${customerId}&month=${currentMonth}`);
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterStatus('all');
    setFilterStartDate(null);
    setFilterEndDate(null);
  };

  const handlePrint = () => {
    // Create a print-friendly table view
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tiffin Orders</title>
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
          <h1>Tiffin Order List</h1>
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Period</th>
                <th class="text-center">Qty</th>
                <th>Days</th>
                <th class="text-right">Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((order) => `
                <tr>
                  <td>
                    <strong>${order.customer_name}</strong><br/>
                    <small>${order.meal_plan_name}</small>
                  </td>
                  <td>${new Date(order.start_date).toLocaleDateString()} - ${new Date(order.end_date).toLocaleDateString()}</td>
                  <td class="text-center">${order.quantity}</td>
                  <td>${order.selected_days && order.selected_days.length > 0 ? order.selected_days.join(', ') : 'All Days'}</td>
                  <td class="text-right">CAD $${Number(order.price).toFixed(2)}</td>
                  <td>${order.payment_status || 'Calculating'}</td>
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

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleImport = () => {
    // Trigger file input click
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
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

      // Skip header row
      const dataLines = lines.slice(1);
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const line of dataLines) {
        try {
          // Parse CSV line (handle quoted fields)
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map((v) => v.replace(/^"|"$/g, '').trim());

          if (cleanValues.length < 19) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns (${cleanValues.length}/19)`);
            continue;
          }

          // Map CSV columns to order fields
          const orderData = {
            customer_id: parseInt(cleanValues[1]),
            meal_plan_id: parseInt(cleanValues[5]),
            quantity: parseInt(cleanValues[10]),
            selected_days: cleanValues[11] ? cleanValues[11].split(';').filter((d) => d) : [],
            price: parseFloat(cleanValues[12]),
            start_date: cleanValues[15],
            end_date: cleanValues[16],
          };

          // Validate required fields
          if (
            !orderData.customer_id ||
            !orderData.meal_plan_id ||
            !orderData.quantity ||
            !orderData.price ||
            !orderData.start_date ||
            !orderData.end_date
          ) {
            errorCount++;
            errors.push(`Line skipped: missing required fields`);
            continue;
          }

          // Create order via API
          await axios.post('/api/customer-orders', orderData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      // Show results
      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} order(s) successfully`, { variant: 'success' });
        // Refresh data
        dispatch(getCustomerOrders());
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} order(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import orders', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    // Create CSV export with all fields from database
    const headers = [
      'Order ID',
      'Customer ID',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Meal Plan ID',
      'Meal Plan Name',
      'Meal Plan Description',
      'Meal Plan Frequency',
      'Meal Plan Days',
      'Quantity',
      'Selected Days',
      'Price',
      'Payment ID',
      'Payment Status',
      'Start Date',
      'End Date',
      'Created At',
      'Updated At',
    ];

    const csvData = dataFiltered.map((order) => [
      order.id,
      order.customer_id,
      `"${order.customer_name || ''}"`, // Quote to handle commas in names
      `"${order.customer_phone || ''}"`,
      `"${order.customer_address || ''}"`,
      order.meal_plan_id,
      `"${order.meal_plan_name || ''}"`,
      `"${order.meal_plan_description || ''}"`,
      order.meal_plan_frequency || '',
      order.meal_plan_days || '',
      order.quantity,
      `"${order.selected_days ? order.selected_days.join(';') : ''}"`, // Use semicolon as separator
      order.price,
      order.payment_id || '',
      order.payment_status || 'calculating',
      order.start_date,
      order.end_date,
      order.created_at,
      order.updated_at,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tiffin-orders-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Orders exported successfully', { variant: 'success' });
  };

  return (
    <>
      <Head>
        <title>Tiffin Orders | TMS</title>
      </Head>

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Tiffin Order List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Orders' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => push(PATH_DASHBOARD.tiffin.orderNew)}
            >
              New Order
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
              <OrderAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={getTotalPriceByStatus('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <OrderAnalytic
                title="Calculating"
                total={getStatusCount('calculating')}
                percent={getPercentByStatus('calculating')}
                price={getTotalPriceByStatus('calculating')}
                icon="eva:refresh-outline"
                color={theme.palette.text.secondary}
              />

              <OrderAnalytic
                title="Pending"
                total={getStatusCount('pending')}
                percent={getPercentByStatus('pending')}
                price={getTotalPriceByStatus('pending')}
                icon="eva:clock-fill"
                color={theme.palette.warning.main}
              />

              <OrderAnalytic
                title="Finalized"
                total={getStatusCount('finalized')}
                percent={getPercentByStatus('finalized')}
                price={getTotalPriceByStatus('finalized')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.info.main}
              />

              <OrderAnalytic
                title="Paid"
                total={getStatusCount('paid')}
                percent={getPercentByStatus('paid')}
                price={getTotalPriceByStatus('paid')}
                icon="eva:checkmark-circle-2-fill"
                color={theme.palette.success.main}
              />

              <OrderAnalytic
                title="Partial Paid"
                total={getStatusCount('partial_paid')}
                percent={getPercentByStatus('partial_paid')}
                price={getTotalPriceByStatus('partial_paid')}
                icon="eva:checkmark-outline"
                color={theme.palette.secondary.main}
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

          <OrderTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterStartDate={filterStartDate}
            filterEndDate={filterEndDate}
            onFilterName={handleFilterName}
            onFilterStartDate={handleFilterStartDate}
            onFilterEndDate={handleFilterEndDate}
            onResetFilter={handleResetFilter}
            onPrint={handlePrint}
            onImport={handleImport}
            onExport={handleExport}
          />

          <TableContainer sx={{ position: 'relative', overflow: 'auto' }}>
            <TableSelectedAction
              dense={dense}
              numSelected={selected.length}
              rowCount={tableData.filter((row) => !row.payment_status || row.payment_status === 'calculating').length}
              onSelectAllRows={(checked) => {
                // Only select orders with "calculating" status (or no status)
                const calculatingOrders = tableData
                  .filter((row) => !row.payment_status || row.payment_status === 'calculating')
                  .map((row) => String(row.id));
                onSelectAllRows(checked, calculatingOrders);
              }}
              action={
                <Tooltip title="Delete">
                  <IconButton color="primary" onClick={handleOpenConfirm}>
                    <Iconify icon="eva:trash-2-outline" />
                  </IconButton>
                </Tooltip>
              }
            />

            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 1000 }}>
                <TableHeadCustom
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.filter((row) => !row.payment_status || row.payment_status === 'calculating').length}
                  numSelected={selected.length}
                  onSort={onSort}
                  onSelectAllRows={(checked) => {
                    // Only select orders with "calculating" status (or no status)
                    const calculatingOrders = tableData
                      .filter((row) => !row.payment_status || row.payment_status === 'calculating')
                      .map((row) => String(row.id));
                    onSelectAllRows(checked, calculatingOrders);
                  }}
                />

                <TableBody>
                  {dataFiltered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <OrderTableRow
                        key={row.id}
                        row={row}
                        selected={selected.includes(String(row.id))}
                        onSelectRow={() => onSelectRow(String(row.id))}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                        onCalculateBilling={() => handleCalculateBilling(row.customer_id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(page, rowsPerPage, tableData.length)}
                  />

                  <TableNoData isNotFound={isNotFound} />
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

      <ConfirmDialog
        open={openConfirm}
        onClose={handleCloseConfirm}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {selected.length} </strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteRows(selected.map((id) => Number(id)));
              handleCloseConfirm();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({
  inputData,
  comparator,
  filterName,
  filterStatus,
  filterStartDate,
  filterEndDate,
}: {
  inputData: ICustomerOrder[];
  comparator: (a: any, b: any) => number;
  filterName: string;
  filterStatus: string;
  filterStartDate: Date | null;
  filterEndDate: Date | null;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  // Filter by search text
  if (filterName) {
    inputData = inputData.filter(
      (order) =>
        order.customer_name?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        order.meal_plan_name?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        order.id?.toString().indexOf(filterName) !== -1
    );
  }

  // Filter by status
  if (filterStatus !== 'all') {
    inputData = inputData.filter((order) => {
      const orderStatus = order.payment_status || 'calculating';
      return orderStatus === filterStatus;
    });
  }

  // Filter by start date
  if (filterStartDate) {
    inputData = inputData.filter((order) => {
      const orderDate = new Date(order.start_date);
      orderDate.setHours(0, 0, 0, 0);
      const startDate = new Date(filterStartDate);
      startDate.setHours(0, 0, 0, 0);
      return orderDate >= startDate;
    });
  }

  // Filter by end date
  if (filterEndDate) {
    inputData = inputData.filter((order) => {
      const orderDate = new Date(order.start_date);
      orderDate.setHours(0, 0, 0, 0);
      const endDate = new Date(filterEndDate);
      endDate.setHours(0, 0, 0, 0);
      return orderDate <= endDate;
    });
  }

  return inputData;
}
