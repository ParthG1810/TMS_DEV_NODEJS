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
  Stack,
  Divider,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getMealPlans, deleteMealPlan } from '../../../redux/slices/mealPlan';
// @types
import { IMealPlan } from '../../../@types/tms';
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
import { MealPlanTableRow, MealPlanTableToolbar, MealPlanAnalytic } from '../../../sections/@dashboard/tiffin/meal-plan/list';
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'meal_name', label: 'Meal Name', align: 'left' },
  { id: 'frequency', label: 'Frequency', align: 'left' },
  { id: 'days', label: 'Days', align: 'left' },
  { id: 'price', label: 'Price (CAD $)', align: 'right' },
  { id: '' },
];

// ----------------------------------------------------------------------

MealPlansPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function MealPlansPage() {
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

  const { mealPlans, isLoading } = useSelector((state) => state.mealPlan);

  const [tableData, setTableData] = useState<IMealPlan[]>([]);
  const [filterName, setFilterName] = useState('');
  const [filterFrequency, setFilterFrequency] = useState('all');
  const [filterPriceOperator, setFilterPriceOperator] = useState('');
  const [filterPriceValue, setFilterPriceValue] = useState('');
  const [openConfirm, setOpenConfirm] = useState(false);
  const [importing, setImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getMealPlans());
  }, [dispatch]);

  useEffect(() => {
    if (mealPlans && mealPlans.length) {
      setTableData(mealPlans);
    }
  }, [mealPlans]);

  // Calculate frequency counts
  const getFrequencyCount = (frequency: string) => {
    if (frequency === 'all') return tableData.length;
    return tableData.filter((plan) => {
      const planFrequency = plan.frequency?.toLowerCase() || '';
      return planFrequency === frequency.toLowerCase();
    }).length;
  };

  const getTotalPriceByFrequency = (frequency: string) => {
    if (frequency === 'all') return sumBy(tableData, (plan) => Number(plan.price) || 0);
    return sumBy(
      tableData.filter((plan) => {
        const planFrequency = plan.frequency?.toLowerCase() || '';
        return planFrequency === frequency.toLowerCase();
      }),
      (plan) => Number(plan.price) || 0
    );
  };

  const getPercentByFrequency = (frequency: string) => {
    if (tableData.length === 0) return 0;
    return (getFrequencyCount(frequency) / tableData.length) * 100;
  };

  const TABS = [
    { value: 'all', label: 'All', color: 'info', count: tableData.length },
    { value: 'daily', label: 'Daily', color: 'success', count: getFrequencyCount('daily') },
    { value: 'weekly', label: 'Weekly', color: 'warning', count: getFrequencyCount('weekly') },
    { value: 'monthly', label: 'Monthly', color: 'error', count: getFrequencyCount('monthly') },
  ] as const;

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
    filterFrequency,
    filterPriceOperator,
    filterPriceValue,
  });

  // Get only deletable rows (meal plans not used in orders)
  const deletableRows = dataFiltered.filter((row) => (row.order_count ?? 0) === 0);

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const denseHeight = dense ? 52 : 72;
  const isFiltered = filterName !== '' || filterFrequency !== 'all' || filterPriceOperator !== '';
  const isNotFound = (!dataFiltered.length && !!filterName) || (!isLoading && !dataFiltered.length);

  const handleOpenConfirm = () => setOpenConfirm(true);
  const handleCloseConfirm = () => setOpenConfirm(false);

  const handleFilterName = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const handleFilterFrequency = (event: React.SyntheticEvent, newValue: string) => {
    setPage(0);
    setFilterFrequency(newValue);
  };

  const handleFilterPriceOperator = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterPriceOperator(event.target.value);
  };

  const handleFilterPriceValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterPriceValue(event.target.value);
  };

  const handleDeleteRow = async (id: number) => {
    try {
      await dispatch(deleteMealPlan(id));
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
      enqueueSnackbar(error.message || 'Failed to delete meal plan', { variant: 'error' });
    }
  };

  const handleDeleteRows = async (selectedRows: number[]) => {
    try {
      await Promise.all(selectedRows.map((id) => dispatch(deleteMealPlan(id))));
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
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to delete meal plans', { variant: 'error' });
    }
  };

  const handleEditRow = (id: number) => {
    push(PATH_DASHBOARD.tiffin.mealPlanEdit(String(id)));
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterFrequency('all');
    setFilterPriceOperator('');
    setFilterPriceValue('');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Meal Plans</title>
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
          <h1>Meal Plan List</h1>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Meal Name</th>
                <th>Description</th>
                <th>Frequency</th>
                <th>Days</th>
                <th class="text-right">Price (CAD $)</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((plan) => `
                <tr>
                  <td>${plan.id}</td>
                  <td>${plan.meal_name}</td>
                  <td>${plan.description || '-'}</td>
                  <td>${plan.frequency || '-'}</td>
                  <td>${plan.days || '-'}</td>
                  <td class="text-right">$${Number(plan.price).toFixed(2)}</td>
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

          if (cleanValues.length < 5) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const mealPlanData = {
            meal_name: cleanValues[1] || cleanValues[0],
            description: cleanValues[2] || '',
            frequency: cleanValues[3] || '',
            days: cleanValues[4] || '',
            price: parseFloat(cleanValues[5]) || 0,
          };

          if (!mealPlanData.meal_name) {
            errorCount++;
            errors.push(`Line skipped: missing meal name`);
            continue;
          }

          await axios.post('/api/meal-plans', mealPlanData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} meal plan(s) successfully`, { variant: 'success' });
        dispatch(getMealPlans());
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} meal plan(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import meal plans', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'ID',
      'Meal Name',
      'Description',
      'Frequency',
      'Days',
      'Price',
      'Created At',
      'Updated At',
    ];

    const csvData = dataFiltered.map((plan) => [
      plan.id,
      `"${plan.meal_name || ''}"`,
      `"${plan.description || ''}"`,
      plan.frequency || '',
      plan.days || '',
      plan.price,
      plan.created_at || '',
      plan.updated_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `meal-plans-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Meal plans exported successfully', { variant: 'success' });
  };

  return (
    <>
      <Head>
        <title>Meal Plans | TMS</title>
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
          heading="Meal Plan List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Meal Plans' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => push(PATH_DASHBOARD.tiffin.mealPlanNew)}
            >
              New Meal Plan
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
              <MealPlanAnalytic
                title="Total"
                total={tableData.length}
                percent={100}
                price={getTotalPriceByFrequency('all')}
                icon="ic:round-receipt"
                color={theme.palette.info.main}
              />

              <MealPlanAnalytic
                title="Daily"
                total={getFrequencyCount('daily')}
                percent={getPercentByFrequency('daily')}
                price={getTotalPriceByFrequency('daily')}
                icon="eva:calendar-outline"
                color={theme.palette.success.main}
              />

              <MealPlanAnalytic
                title="Weekly"
                total={getFrequencyCount('weekly')}
                percent={getPercentByFrequency('weekly')}
                price={getTotalPriceByFrequency('weekly')}
                icon="eva:calendar-outline"
                color={theme.palette.warning.main}
              />

              <MealPlanAnalytic
                title="Monthly"
                total={getFrequencyCount('monthly')}
                percent={getPercentByFrequency('monthly')}
                price={getTotalPriceByFrequency('monthly')}
                icon="eva:calendar-outline"
                color={theme.palette.error.main}
              />
            </Stack>
          </Scrollbar>
        </Card>

        <Card>
          {/* Frequency Tabs */}
          <Tabs
            value={filterFrequency}
            onChange={handleFilterFrequency}
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
                iconPosition="start"
              />
            ))}
          </Tabs>

          <Divider />

          <MealPlanTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterPriceOperator={filterPriceOperator}
            filterPriceValue={filterPriceValue}
            onFilterName={handleFilterName}
            onFilterPriceOperator={handleFilterPriceOperator}
            onFilterPriceValue={handleFilterPriceValue}
            onResetFilter={handleResetFilter}
            onPrint={handlePrint}
            onImport={handleImport}
            onExport={handleExport}
          />

          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <TableSelectedAction
              dense={dense}
              numSelected={selected.length}
              rowCount={deletableRows.length}
              onSelectAllRows={(checked) =>
                onSelectAllRows(
                  checked,
                  deletableRows.map((row) => String(row.id))
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
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={deletableRows.length}
                  numSelected={selected.length}
                  onSort={onSort}
                  onSelectAllRows={(checked) =>
                    onSelectAllRows(
                      checked,
                      deletableRows.map((row) => String(row.id))
                    )
                  }
                />

                <TableBody>
                  {dataFiltered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <MealPlanTableRow
                        key={row.id}
                        row={row}
                        selected={selected.includes(String(row.id))}
                        onSelectRow={() => onSelectRow(String(row.id))}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
                        hasOrders={(row.order_count ?? 0) > 0}
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
  filterFrequency,
  filterPriceOperator,
  filterPriceValue,
}: {
  inputData: IMealPlan[];
  comparator: (a: any, b: any) => number;
  filterName: string;
  filterFrequency: string;
  filterPriceOperator: string;
  filterPriceValue: string;
}) {
  const stabilizedThis = inputData.map((el, index) => [el, index] as const);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  // Filter by name/description search
  if (filterName) {
    inputData = inputData.filter(
      (plan) =>
        plan.meal_name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        plan.description?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  // Filter by frequency
  if (filterFrequency !== 'all') {
    inputData = inputData.filter((plan) => {
      const planFrequency = plan.frequency?.toLowerCase() || '';
      return planFrequency === filterFrequency.toLowerCase();
    });
  }

  // Filter by price
  if (filterPriceOperator && filterPriceValue) {
    const priceValue = parseFloat(filterPriceValue);
    if (!isNaN(priceValue)) {
      inputData = inputData.filter((plan) => {
        const price = Number(plan.price) || 0;
        switch (filterPriceOperator) {
          case '>':
            return price > priceValue;
          case '>=':
            return price >= priceValue;
          case '<':
            return price < priceValue;
          case '<=':
            return price <= priceValue;
          case '==':
            return price === priceValue;
          default:
            return true;
        }
      });
    }
  }

  return inputData;
}
