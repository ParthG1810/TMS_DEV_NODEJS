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
import { getTMSRecipes, deleteTMSRecipe } from '../../redux/slices/tmsRecipe';
// @types
import { ITMSRecipe } from '../../@types/tms';
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
import { RecipeTableRow, RecipeTableToolbar } from '../../sections/@dashboard/tms/recipe/list';
import DashboardLayout from '../../layouts/dashboard';
import axios from '../../utils/axios';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Recipe', align: 'left' },
  { id: 'ingredients', label: 'Ingredients', align: 'center' },
  { id: 'images', label: 'Images', align: 'center' },
  { id: 'total_cost', label: 'Total Cost', align: 'right' },
  { id: '' },
];

// ----------------------------------------------------------------------

RecipeManagementPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function RecipeManagementPage() {
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

  const { recipes, isLoading } = useSelector((state) => state.tmsRecipe);

  const [tableData, setTableData] = useState<ITMSRecipe[]>([]);

  const [filterName, setFilterName] = useState('');
  const [filterCostOperator, setFilterCostOperator] = useState('');
  const [filterCostValue, setFilterCostValue] = useState('');
  const [importing, setImporting] = useState(false);

  const [openConfirm, setOpenConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    dispatch(getTMSRecipes());
  }, [dispatch]);

  useEffect(() => {
    if (recipes.length) {
      setTableData(recipes);
    }
  }, [recipes]);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(order, orderBy),
    filterName,
    filterCostOperator,
    filterCostValue,
  });

  const dataInPage = dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const denseHeight = dense ? 72 : 92;

  const isFiltered = filterName !== '' || filterCostOperator !== '';

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

  const handleFilterCostOperator = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterCostOperator(event.target.value);
  };

  const handleFilterCostValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPage(0);
    setFilterCostValue(event.target.value);
  };

  const handleDeleteRow = async (id: number) => {
    try {
      await dispatch(deleteTMSRecipe(id));
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
      enqueueSnackbar(error.message || 'Failed to delete recipe', { variant: 'error' });
    }
  };

  const handleDeleteRows = async (selectedRows: number[]) => {
    try {
      await Promise.all(selectedRows.map((id) => dispatch(deleteTMSRecipe(id))));
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
      enqueueSnackbar('Failed to delete recipes', { variant: 'error' });
    }
  };

  const handleEditRow = (id: number) => {
    push(PATH_DASHBOARD.recipe.edit(String(id)));
  };

  const handleResetFilter = () => {
    setFilterName('');
    setFilterCostOperator('');
    setFilterCostValue('');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Recipe List</title>
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
          <h1>Recipe List</h1>
          <table>
            <thead>
              <tr>
                <th>Recipe Name</th>
                <th>Description</th>
                <th class="text-center">Ingredients</th>
                <th class="text-center">Images</th>
                <th class="text-right">Total Cost</th>
              </tr>
            </thead>
            <tbody>
              ${dataFiltered.map((recipe) => `
                <tr>
                  <td><strong>${recipe.name}</strong></td>
                  <td>${recipe.description || '-'}</td>
                  <td class="text-center">${recipe.ingredients?.length || 0}</td>
                  <td class="text-center">${recipe.images?.length || 0}</td>
                  <td class="text-right">$${Number(recipe.total_cost || 0).toFixed(2)}</td>
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

          if (cleanValues.length < 3) {
            errorCount++;
            errors.push(`Line skipped: insufficient columns`);
            continue;
          }

          const recipeData = {
            name: cleanValues[1] || '',
            description: cleanValues[2] || '',
          };

          if (!recipeData.name) {
            errorCount++;
            errors.push(`Line skipped: missing recipe name`);
            continue;
          }

          await axios.post('/api/recipes', recipeData);
          successCount++;
        } catch (error: any) {
          errorCount++;
          errors.push(error.response?.data?.error || error.message || 'Unknown error');
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Imported ${successCount} recipe(s) successfully`, { variant: 'success' });
        dispatch(getTMSRecipes());
      }

      if (errorCount > 0) {
        const errorMsg = `${errorCount} recipe(s) failed. ${errors.slice(0, 3).join(', ')}${
          errors.length > 3 ? '...' : ''
        }`;
        enqueueSnackbar(errorMsg, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to import recipes', { variant: 'error' });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = [
      'Recipe ID',
      'Name',
      'Description',
      'Ingredients Count',
      'Images Count',
      'Total Cost',
      'Created At',
      'Updated At',
    ];

    const csvData = dataFiltered.map((recipe) => [
      recipe.id,
      `"${recipe.name || ''}"`,
      `"${recipe.description || ''}"`,
      recipe.ingredients?.length || 0,
      recipe.images?.length || 0,
      recipe.total_cost || 0,
      recipe.created_at || '',
      recipe.updated_at || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `recipes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Recipes exported successfully', { variant: 'success' });
  };

  return (
    <>
      <Head>
        <title>Recipe Management | TMS</title>
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
          heading="Recipe List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Recipe', href: PATH_DASHBOARD.recipe.root },
            { name: 'List' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => push(PATH_DASHBOARD.recipe.new)}
            >
              New Recipe
            </Button>
          }
        />

        <Card>
          <RecipeTableToolbar
            isFiltered={isFiltered}
            filterName={filterName}
            filterCostOperator={filterCostOperator}
            filterCostValue={filterCostValue}
            onFilterName={handleFilterName}
            onFilterCostOperator={handleFilterCostOperator}
            onFilterCostValue={handleFilterCostValue}
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
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
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
                      <RecipeTableRow
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
  filterCostOperator,
  filterCostValue,
}: {
  inputData: ITMSRecipe[];
  comparator: (a: any, b: any) => number;
  filterName: string;
  filterCostOperator: string;
  filterCostValue: string;
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
      (recipe) =>
        recipe.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        recipe.description?.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  // Filter by total cost
  if (filterCostOperator && filterCostValue) {
    const costValue = parseFloat(filterCostValue);
    if (!isNaN(costValue)) {
      inputData = inputData.filter((recipe) => {
        const cost = Number(recipe.total_cost) || 0;
        switch (filterCostOperator) {
          case '>':
            return cost > costValue;
          case '>=':
            return cost >= costValue;
          case '<':
            return cost < costValue;
          case '<=':
            return cost <= costValue;
          case '==':
            return cost === costValue;
          default:
            return true;
        }
      });
    }
  }

  return inputData;
}
