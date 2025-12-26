import { useState, useEffect, useCallback, useRef } from 'react';
// next
import Head from 'next/head';
import NextLink from 'next/link';
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
  Divider,
  Stack,
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
  TableSkeleton,
} from '../../../components/table';
// sections
import { UserTableToolbar, UserTableRow, UserAnalytic } from '../../../sections/@dashboard/user/list';

// ----------------------------------------------------------------------

// Default admin email that cannot be deleted
const PROTECTED_ADMIN_EMAIL = 'admin@tms.com';

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
  const theme = useTheme();

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [tableData, setTableData] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [importing, setImporting] = useState(false);

  // Check if current user can manage users
  const canManageUsers = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  // Check if a user is protected (cannot be deleted)
  const isProtectedUser = (user: UserData) => {
    return user.email === PROTECTED_ADMIN_EMAIL || user.id === currentUser?.id;
  };

  // Get selectable users (exclude protected users)
  const getSelectableUsers = () => {
    return tableData.filter((user) => !isProtectedUser(user));
  };

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

  // Calculate role counts
  const getRoleCount = (role: string) => {
    if (role === 'all') return tableData.length;
    return tableData.filter((user) => user.role === role).length;
  };

  const getPercentByRole = (role: string) => {
    if (tableData.length === 0) return 0;
    return (getRoleCount(role) / tableData.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: tableData.length },
    { value: 'admin', label: 'Admin', color: 'error', count: getRoleCount('admin') },
    { value: 'manager', label: 'Manager', color: 'warning', count: getRoleCount('manager') },
    { value: 'staff', label: 'Staff', color: 'success', count: getRoleCount('staff') },
    { value: 'tester', label: 'Tester', color: 'secondary', count: getRoleCount('tester') },
    { value: 'user', label: 'User', color: 'default', count: getRoleCount('user') },
  ] as const;

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

  const handleFilterRole = (event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterRole(newValue);
  };

  const handleDeleteRow = async (id: string) => {
    // Check if user is protected
    const userToDelete = tableData.find((user) => user.id === id);
    if (userToDelete && isProtectedUser(userToDelete)) {
      enqueueSnackbar('Cannot delete this user', { variant: 'error' });
      return;
    }

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
    // Filter out protected users
    const deletableRows = selectedRows.filter((id) => {
      const user = tableData.find((u) => u.id === id);
      return user && !isProtectedUser(user);
    });

    if (deletableRows.length === 0) {
      enqueueSnackbar('No deletable users selected', { variant: 'warning' });
      return;
    }

    try {
      // Delete users one by one
      await Promise.all(deletableRows.map((id) => axios.delete(`/api/users/${id}`)));

      const deleteRows = tableData.filter((row) => !deletableRows.includes(row.id));
      setSelected([]);
      setTableData(deleteRows);
      enqueueSnackbar('Users deleted successfully');

      if (page > 0) {
        if (deletableRows.length === dataInPage.length) {
          setPage(page - 1);
        } else if (deletableRows.length === dataFiltered.length) {
          setPage(0);
        } else if (deletableRows.length > dataInPage.length) {
          const newPage = Math.ceil((tableData.length - deletableRows.length) / rowsPerPage) - 1;
          setPage(newPage);
        }
      }
    } catch (error) {
      console.error('Failed to delete users:', error);
      enqueueSnackbar(error?.message || 'Failed to delete users', { variant: 'error' });
    }
  };

  const handleEditRow = (id: string) => {
    push(PATH_DASHBOARD.user.edit(id));
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterRole('all');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>User List</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { text-align: center; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .role-admin { color: #d32f2f; }
            .role-manager { color: #ed6c02; }
            .role-staff { color: #2e7d32; }
            .role-tester { color: #9c27b0; }
            .role-user { color: #757575; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>User List</h1>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((user) => `
                <tr>
                  <td>${user.name}</td>
                  <td>${user.email}</td>
                  <td class="role-${user.role}">${user.role}</td>
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

      for (const line of dataLines) {
        try {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
          const cleanValues = values.map((v) => v.replace(/^"|"$/g, '').trim());

          if (cleanValues.length < 4) {
            errorCount++;
            continue;
          }

          const userData = {
            displayName: cleanValues[0],
            email: cleanValues[1],
            password: cleanValues[2],
            role: cleanValues[3] || 'user',
          };

          if (!userData.displayName || !userData.email || !userData.password) {
            errorCount++;
            continue;
          }

          await axios.post('/api/users', userData);
          successCount++;
        } catch (error: any) {
          errorCount++;
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} user(s) successfully`, { variant: 'success' });
        fetchUsers();
      }

      if (errorCount > 0) {
        enqueueSnackbar(`${errorCount} user(s) failed to import`, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import users', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ['Name', 'Email', 'Role'];
    const csvData = dataFiltered.map((user) => [
      `"${user.name}"`,
      `"${user.email}"`,
      user.role,
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Users exported successfully', { variant: 'success' });
  };

  // Custom select all handler that excludes protected users
  const handleSelectAllRows = (checked: boolean) => {
    const selectableIds = getSelectableUsers().map((user) => user.id);
    onSelectAllRows(checked, selectableIds);
  };

  // Custom select row handler that prevents selection of protected users
  const handleSelectRow = (id: string) => {
    const user = tableData.find((u) => u.id === id);
    if (user && isProtectedUser(user)) {
      return; // Don't allow selection of protected users
    }
    onSelectRow(id);
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

      {/* Hidden file input for CSV import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

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

        {/* Analytics Cards */}
        <Card sx={{ mb: 5 }}>
          <Scrollbar>
            <Stack
              direction="row"
              divider={<Divider orientation="vertical" flexItem sx={{ borderStyle: 'dashed' }} />}
              sx={{ py: 2 }}
            >
              <UserAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                icon="ic:round-people"
                color={theme.palette.info.main}
              />

              <UserAnalytic
                title="Admin"
                total={getRoleCount('admin')}
                percent={getPercentByRole('admin')}
                icon="ic:round-admin-panel-settings"
                color={theme.palette.error.main}
              />

              <UserAnalytic
                title="Manager"
                total={getRoleCount('manager')}
                percent={getPercentByRole('manager')}
                icon="ic:round-supervisor-account"
                color={theme.palette.warning.main}
              />

              <UserAnalytic
                title="Staff"
                total={getRoleCount('staff')}
                percent={getPercentByRole('staff')}
                icon="ic:round-badge"
                color={theme.palette.success.main}
              />

              <UserAnalytic
                title="Tester"
                total={getRoleCount('tester')}
                percent={getPercentByRole('tester')}
                icon="ic:round-bug-report"
                color={theme.palette.secondary.main}
              />

              <UserAnalytic
                title="User"
                total={getRoleCount('user')}
                percent={getPercentByRole('user')}
                icon="ic:round-person"
                color={theme.palette.text.secondary}
              />
            </Stack>
          </Scrollbar>
        </Card>

        <Card>
          {/* Role Tabs */}
          <Tabs
            value={filterRole}
            onChange={handleFilterRole}
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

          <UserTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            onFilterName={handleFilterName}
            onResetFilter={handleResetFilter}
            onPrint={handlePrint}
            onImport={currentUser?.role === 'admin' ? handleImport : undefined}
            onExport={handleExport}
          />

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <TableSelectedAction
              dense={dense}
              numSelected={selected.length}
              rowCount={getSelectableUsers().length}
              onSelectAllRows={(checked) => handleSelectAllRows(checked)}
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
                  rowCount={getSelectableUsers().length}
                  numSelected={selected.length}
                  onSort={onSort}
                  onSelectAllRows={(checked) => handleSelectAllRows(checked)}
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
                            onSelectRow={() => handleSelectRow(row.id)}
                            onDeleteRow={() => handleDeleteRow(row.id)}
                            onEditRow={() => handleEditRow(row.id)}
                            isProtected={isProtectedUser(row)}
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
