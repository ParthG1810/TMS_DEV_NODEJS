import { paramCase } from 'change-case';
import { useState, useEffect, useCallback } from 'react';
// next
import Head from 'next/head';
import NextLink from 'next/link';
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
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// utils
import axios from '../../../utils/axios';
// layouts
import DashboardLayout from '../../../layouts/dashboard';
// auth
import { useAuthContext } from '../../../auth/useAuthContext';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import ConfirmDialog from '../../../components/confirm-dialog';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSettingsContext } from '../../../components/settings';
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
  TableSkeleton,
} from '../../../components/table';
// sections
import { UserTableToolbar, UserTableRow } from '../../../sections/@dashboard/user/list';

// ----------------------------------------------------------------------

const ROLE_OPTIONS = ['all', 'admin', 'manager', 'staff', 'tester', 'user'];

const TABLE_HEAD = [
  { id: 'name', label: 'Name', align: 'left' },
  { id: 'email', label: 'Email', align: 'left' },
  { id: 'role', label: 'Role', align: 'left' },
  { id: '' },
];

// ----------------------------------------------------------------------

UserListPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

// ----------------------------------------------------------------------

// User type for this page
interface UserData {
  id: string;
  avatarUrl: string;
  name: string;
  email: string;
  role: string;
}

// Transform API user to table format
const transformUser = (apiUser: any): UserData => ({
  id: apiUser.id,
  avatarUrl: apiUser.photoURL || '',
  name: apiUser.displayName,
  email: apiUser.email,
  role: apiUser.role,
});

export default function UserListPage() {
  const {
    dense,
    page,
    order,
    orderBy,
    rowsPerPage,
    setPage,
    //
    selected,
    setSelected,
    onSelectRow,
    onSelectAllRows,
    //
    onSort,
    onChangeDense,
    onChangePage,
    onChangeRowsPerPage,
  } = useTable();

  const { themeStretch } = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const { user: currentUser } = useAuthContext();
  const { push } = useRouter();

  const [tableData, setTableData] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [openConfirm, setOpenConfirm] = useState(false);

  // Check if current user can manage users
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Fetch users from API
  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/users', {
        params: {
          page: 1,
          limit: 1000, // Get all users, pagination handled client-side for now
        },
      });
      const users = response.data.users.map(transformUser);
      setTableData(users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      enqueueSnackbar('Failed to load users', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    if (canManageUsers) {
      fetchUsers();
    }
  }, [fetchUsers, canManageUsers]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
    filterRole,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const denseHeight = dense ? 52 : 72;

  const isFiltered = filterName !== '' || filterRole !== 'all';

  const isNotFound =
    (!dataFiltered.length && !!filterName) ||
    (!dataFiltered.length && !!filterRole);

  const handleOpenConfirm = () => {
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setOpenConfirm(false);
  };

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const handleFilterRole = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterRole(event.target.value);
  };

  const handleDeleteRow = async (id: string) => {
    try {
      await axios.delete(`/api/users/${id}`);
      const deleteRow = tableData.filter((row) => row.id !== id);
      setSelected([]);
      setTableData(deleteRow);
      enqueueSnackbar('User deleted successfully');

      if (page > 0) {
        if (dataInPage.length < 2) {
          setPage(page - 1);
        }
      }
    } catch (error) {
      console.error('Failed to delete user:', error);
      enqueueSnackbar(error?.message || 'Failed to delete user', { variant: 'error' });
    }
  };

  const handleDeleteRows = async (selectedRows: string[]) => {
    try {
      // Delete users one by one
      await Promise.all(selectedRows.map((id) => axios.delete(`/api/users/${id}`)));

      const deleteRows = tableData.filter((row) => !selectedRows.includes(row.id));
      setSelected([]);
      setTableData(deleteRows);
      enqueueSnackbar('Users deleted successfully');

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
    } catch (error) {
      console.error('Failed to delete users:', error);
      enqueueSnackbar(error?.message || 'Failed to delete users', { variant: 'error' });
    }
  };

  const handleEditRow = (id: string) => {
    push(PATH_DASHBOARD.user.edit(paramCase(id)));
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterRole('all');
  };

  // Show permission denied for non-admin/manager users
  if (!canManageUsers) {
    return (
      <>
        <Head>
          <title>User: List | TMS</title>
        </Head>
        <Container maxWidth={themeStretch ? false : 'lg'}>
          <CustomBreadcrumbs
            heading="User List"
            links={[
              { name: 'Dashboard', href: PATH_DASHBOARD.root },
              { name: 'User', href: PATH_DASHBOARD.user.root },
              { name: 'List' },
            ]}
          />
          <Card sx={{ p: 3, textAlign: 'center' }}>
            <Iconify icon="eva:lock-fill" width={48} sx={{ color: 'text.secondary', mb: 2 }} />
            <p>You do not have permission to view the user list.</p>
          </Card>
        </Container>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>User: List | TMS</title>
      </Head>

      <Container maxWidth={themeStretch ? false : 'lg'}>
        <CustomBreadcrumbs
          heading="User List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'User', href: PATH_DASHBOARD.user.root },
            { name: 'List' },
          ]}
          action={
            currentUser?.role === 'admin' && (
              <Button
                component={NextLink}
                href={PATH_DASHBOARD.user.new}
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" />}
              >
                New User
              </Button>
            )
          }
        />

        <Card>
          <UserTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterRole={filterRole}
            optionsRole={ROLE_OPTIONS}
            onFilterName={handleFilterName}
            onFilterRole={handleFilterRole}
            onResetFilter={handleResetFilter}
          />

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <TableSelectedAction
              dense={dense}
              numSelected={selected.length}
              rowCount={tableData.length}
              onSelectAllRows={(checked) =>
                onSelectAllRows(
                  checked,
                  tableData.map((row) => row.id)
                )
              }
              action={
                currentUser?.role === 'admin' && (
                  <Tooltip title="Delete">
                    <IconButton color="primary" onClick={handleOpenConfirm}>
                      <Iconify icon="eva:trash-2-outline" />
                    </IconButton>
                  </Tooltip>
                )
              }
            />

            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
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
                      tableData.map((row) => row.id)
                    )
                  }
                />

                <TableBody>
                  {isLoading ? (
                    [...Array(rowsPerPage)].map((_, index) => (
                      <TableSkeleton key={index} sx={{ height: denseHeight }} />
                    ))
                  ) : (
                    <>
                      {dataFiltered
                        .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                        .map((row) => (
                          <UserTableRow
                            key={row.id}
                            row={row}
                            selected={selected.includes(row.id)}
                            onSelectRow={() => onSelectRow(row.id)}
                            onDeleteRow={() => handleDeleteRow(row.id)}
                            onEditRow={() => handleEditRow(row.id)}
                          />
                        ))}

                      <TableEmptyRows
                        height={denseHeight}
                        emptyRows={emptyRows(page, rowsPerPage, tableData.length)}
                      />

                      <TableNoData isNotFound={isNotFound} />
                    </>
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
            //
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
              handleDeleteRows(selected);
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
  filterRole,
}: {
  inputData: UserData[];
  comparator: (a: any, b: any) => number;
  filterName: string;
  filterRole: string;
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
      (user) =>
        user.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        user.email.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  if (filterRole !== 'all') {
    inputData = inputData.filter((user) => user.role === filterRole);
  }

  return inputData;
}
