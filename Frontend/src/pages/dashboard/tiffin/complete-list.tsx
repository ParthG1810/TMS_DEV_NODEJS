import { useEffect, useState } from 'react';
import Head from 'next/head';
import { format } from 'date-fns';
// @mui
import {
  Card,
  Table,
  TableRow,
  TableBody,
  TableCell,
  Container,
  TableContainer,
  Stack,
  InputAdornment,
  TextField,
  Chip,
  Box,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getCompleteTiffinList } from '../../../redux/slices/customerOrder';
// components
import Iconify from '../../../components/iconify';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import {
  useTable,
  getComparator,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '../../../components/table';
import DashboardLayout from '../../../layouts/dashboard';
// @types
import { ICustomerOrder } from '../../../@types/tms';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'customer_name', label: 'Customer', align: 'left' },
  { id: 'meal_plan_name', label: 'Meal Plan', align: 'left' },
  { id: 'quantity', label: 'Qty', align: 'center' },
  { id: 'selected_days', label: 'Days', align: 'left' },
  { id: 'price', label: 'Price (₹)', align: 'right' },
  { id: 'dates', label: 'Period', align: 'left' },
];

// ----------------------------------------------------------------------

CompleteTiffinListPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default function CompleteTiffinListPage() {
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
  } = useTable();

  const dispatch = useDispatch();

  const { completeOrders, isLoading } = useSelector((state) => state.customerOrder);

  const [tableData, setTableData] = useState<ICustomerOrder[]>([]);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    dispatch(
      getCompleteTiffinList({
        search: filterName,
        page: page + 1,
        limit: rowsPerPage,
        sortBy: orderBy || 'created_at',
        sortOrder: order,
      })
    );
  }, [dispatch, filterName, page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    if (completeOrders && completeOrders.length) {
      setTableData(completeOrders);
    }
  }, [completeOrders]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
  });

  const denseHeight = dense ? 52 : 72;
  const isNotFound = (!dataFiltered.length && !!filterName) || (!isLoading && !dataFiltered.length);

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  return (
    <>
      <Head>
        <title>Complete Tiffin List | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Complete Tiffin List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Complete List' },
          ]}
        />

        <Card>
          <Stack
            spacing={2}
            alignItems="center"
            direction={{
              xs: 'column',
              sm: 'row',
            }}
            sx={{ px: 2.5, py: 3 }}
          >
            <TextField
              fullWidth
              value={filterName}
              onChange={handleFilterName}
              placeholder="Search orders..."
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 1000 }}>
                <TableHeadCustom
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={tableData.length}
                  onSort={onSort}
                />

                <TableBody>
                  {dataFiltered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <TableRow key={row.id} hover>
                        <TableCell>{row.customer_name}</TableCell>
                        <TableCell>{row.meal_plan_name}</TableCell>
                        <TableCell align="center">{row.quantity}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {row.selected_days && row.selected_days.length > 0 ? (
                              row.selected_days.slice(0, 3).map((day) => (
                                <Chip key={day} label={day.substring(0, 3)} size="small" />
                              ))
                            ) : (
                              <Chip label="All" size="small" />
                            )}
                            {row.selected_days && row.selected_days.length > 3 && (
                              <Chip
                                label={`+${row.selected_days.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">₹{Number(row.price).toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(row.start_date), 'dd MMM yyyy')} -{' '}
                          {format(new Date(row.end_date), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
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
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({
  inputData,
  comparator,
  filterName,
}: {
  inputData: ICustomerOrder[];
  comparator: (a: any, b: any) => number;
  filterName: string;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (filterName) {
    inputData = inputData.filter(
      (order) =>
        order.customer_name?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        order.meal_plan_name?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  return inputData;
}
