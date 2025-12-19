import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
// @mui
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
  alpha,
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
import { OrderTableRow, OrderTableToolbar } from '../../../sections/@dashboard/tiffin/order/list';
import DashboardLayout from '../../../layouts/dashboard';

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

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'calculating', label: 'Calculating' },
  { value: 'pending', label: 'Pending' },
  { value: 'finalized', label: 'Finalized' },
  { value: 'paid', label: 'Paid' },
  { value: 'partial_paid', label: 'Partial Paid' },
];

// ----------------------------------------------------------------------

OrdersPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function OrdersPage() {
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
    window.print();
  };

  const handleImport = () => {
    enqueueSnackbar('Import functionality coming soon', { variant: 'info' });
  };

  const handleExport = () => {
    // Create CSV export
    const headers = ['Order ID', 'Customer', 'Date', 'Items', 'Price', 'Status'];
    const csvData = dataFiltered.map((order) => [
      order.id,
      order.customer_name,
      new Date(order.start_date).toLocaleDateString(),
      order.selected_days && order.selected_days.length > 0 ? order.selected_days.length : 7,
      order.price,
      order.payment_status || 'calculating',
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

        <Card>
          {/* Status Tabs */}
          <Tabs
            value={filterStatus}
            onChange={handleFilterStatus}
            sx={{
              px: 2.5,
              pt: 2,
              bgcolor: 'background.neutral',
              borderBottom: (theme) => `solid 1px ${alpha(theme.palette.grey[500], 0.24)}`,
            }}
          >
            {STATUS_OPTIONS.map((tab) => (
              <Tab
                key={tab.value}
                value={tab.value}
                label={tab.label}
                icon={
                  <Box
                    sx={{
                      minWidth: 20,
                      height: 20,
                      borderRadius: '6px',
                      bgcolor: filterStatus === tab.value ? 'primary.main' : 'grey.400',
                      color: 'common.white',
                      fontSize: 11,
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      ml: 1,
                    }}
                  >
                    {getStatusCount(tab.value)}
                  </Box>
                }
                iconPosition="end"
              />
            ))}
          </Tabs>

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

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <TableSelectedAction
              dense={dense}
              numSelected={selected.length}
              rowCount={tableData.length}
              onSelectAllRows={(checked) =>
                onSelectAllRows(
                  checked,
                  tableData.map((row) => String(row.id))
                )
              }
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
                  rowCount={tableData.length}
                  numSelected={selected.length}
                  onSort={onSort}
                  onSelectAllRows={(checked) =>
                    onSelectAllRows(
                      checked,
                      tableData.map((row) => String(row.id))
                    )
                  }
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
