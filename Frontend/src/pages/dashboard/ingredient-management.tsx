import { useEffect, useState, useRef } from 'react';
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
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../redux/store';
import { getTMSIngredients, deleteTMSIngredient } from '../../redux/slices/tmsIngredient';
// @types
import { ITMSIngredient } from '../../@types/tms';
// components
import Iconify from '../../components/iconify';
import Scrollbar from '../../components/scrollbar';
import ConfirmDialog from '../../components/confirm-dialog';
import CustomBreadcrumbs from '../../components/custom-breadcrumbs';
import { useSnackbar } from '../../components/snackbar';
import {
  useTable,
  getComparator,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from '../../components/table';
// sections
import { IngredientTableRow, IngredientTableToolbar } from '../../sections/@dashboard/tms/ingredient/list';
import DashboardLayout from '../../layouts/dashboard';
import axios from '../../utils/axios';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Ingredient', align: 'left' },
  { id: 'vendors', label: 'Vendors', align: 'left' },
  { id: 'defaultVendor', label: 'Default Vendor', align: 'left' },
  { id: '' },
];

// ----------------------------------------------------------------------

IngredientManagementPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function IngredientManagementPage() {
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

  const { push } = useRouter();

  const dispatch = useDispatch();

  const { enqueueSnackbar } = useSnackbar();

  const { ingredients, isLoading } = useSelector((state) => state.tmsIngredient);

  const [tableData, setTableData] = useState<ITMSIngredient[]>([]);

  const [filterName, setFilterName] = useState('');
  const [importing, setImporting] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getTMSIngredients());
  }, [dispatch]);

  useEffect(() => {
    if (ingredients.length) {
      setTableData(ingredients);
    }
  }, [ingredients]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const denseHeight = dense ? 52 : 72;

  const isFiltered = filterName !== '';

  const isNotFound = (!dataFiltered.length && !!filterName) || (!isLoading && !dataFiltered.length);

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

  const handleDeleteRow = async (id: number) => {
    try {
      await dispatch(deleteTMSIngredient(id));
      const deleteRow = tableData.filter((row) => row.id !== id);
      setTableData(deleteRow);
      enqueueSnackbar('Delete success!');

      if (page > 0) {
        if (dataInPage.length < 2) {
          setPage(page - 1);
        }
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Failed to delete ingredient', { variant: 'error' });
    }
  };

  const handleDeleteRows = async (selectedRows: number[]) => {
    try {
      await Promise.all(selectedRows.map((id) => dispatch(deleteTMSIngredient(id))));
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
      enqueueSnackbar('Failed to delete ingredients', { variant: 'error' });
    }
  };

  const handleEditRow = (id: number) => {
    push(PATH_DASHBOARD.ingredient.edit(String(id)));
  };

  const handleResetFilter = () => {
    setFilterName('');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ingredient List</title>
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
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <h1>Ingredient List</h1>
          <table>
            <thead>
              <tr>
                <th>Ingredient Name</th>
                <th>Description</th>
                <th class="text-center">Vendors</th>
                <th>Default Vendor</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((ingredient) => `
                <tr>
                  <td><strong>${ingredient.name}</strong></td>
                  <td>${ingredient.description || '-'}</td>
                  <td class="text-center">${ingredient.vendors?.length || 0}</td>
                  <td>${ingredient.default_vendor?.name || '-'}</td>
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

          if (cleanValues.length < 2) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const ingredientData = {
            name: cleanValues[1] || '',
            description: cleanValues[2] || '',
          };

          if (!ingredientData.name) {
            errorCount++;
            errors.push(`Line skipped: missing ingredient name`);
            continue;
          }

          await axios.post('/api/ingredients', ingredientData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} ingredient(s) successfully`, { variant: 'success' });
        dispatch(getTMSIngredients());
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} ingredient(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import ingredients', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'Ingredient ID',
      'Name',
      'Description',
      'Vendors Count',
      'Default Vendor',
      'Created At',
      'Updated At',
    ];

    const csvData = dataFiltered.map((ingredient) => [
      ingredient.id,
      `"${ingredient.name || ''}"`,
      `"${ingredient.description || ''}"`,
      ingredient.vendors?.length || 0,
      `"${ingredient.default_vendor?.name || ''}"`,
      ingredient.created_at || '',
      ingredient.updated_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ingredients-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Ingredients exported successfully', { variant: 'success' });
  };

  return (
    <>
      <Head>
        <title>Ingredient Management | TMS</title>
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
          heading="Ingredient List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Ingredient', href: PATH_DASHBOARD.ingredient.root },
            { name: 'List' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => push(PATH_DASHBOARD.ingredient.new)}
            >
              New Ingredient
            </Button>
          }
        />

        <Card>
          <IngredientTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            onFilterName={handleFilterName}
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
                      tableData.map((row) => String(row.id))
                    )
                  }
                />

                <TableBody>
                  {dataFiltered
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row) => (
                      <IngredientTableRow
                        key={row.id}
                        row={row}
                        selected={selected.includes(String(row.id))}
                        onSelectRow={() => onSelectRow(String(row.id))}
                        onDeleteRow={() => handleDeleteRow(row.id)}
                        onEditRow={() => handleEditRow(row.id)}
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
}: {
  inputData: ITMSIngredient[];
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
      (ingredient) =>
        ingredient.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        ingredient.description?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  return inputData;
}
