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
  Typography,
  Stack,
  Chip,
  Box,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import { LabelTemplate } from '../../../@types/label';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import ConfirmDialog from '../../../components/confirm-dialog';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSnackbar } from '../../../components/snackbar';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from '../../../components/table';
// sections
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// ----------------------------------------------------------------------

const TABLE_HEAD = [
  { id: 'name', label: 'Template Name', align: 'left' },
  { id: 'size', label: 'Size', align: 'left' },
  { id: 'description', label: 'Description', align: 'left' },
  { id: 'is_default', label: 'Default', align: 'center' },
  { id: '', width: 120 },
];

// ----------------------------------------------------------------------

LabelTemplatesPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function LabelTemplatesPage() {
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

  const { push } = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [tableData, setTableData] = useState<LabelTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openConfirm, setOpenConfirm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get('/api/label-templates');
      if (response.data.success) {
        setTableData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      enqueueSnackbar('Failed to load templates', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const dataInPage = tableData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  const denseHeight = dense ? 52 : 72;
  const isNotFound = !isLoading && !tableData.length;

  const handleOpenConfirm = (id: number) => {
    setDeleteId(id);
    setOpenConfirm(true);
  };

  const handleCloseConfirm = () => {
    setDeleteId(null);
    setOpenConfirm(false);
  };

  const handleDeleteRow = async () => {
    if (!deleteId) return;

    try {
      await axios.delete(`/api/label-templates/${deleteId}`);
      const deleteRow = tableData.filter((row) => row.id !== deleteId);
      setTableData(deleteRow);
      enqueueSnackbar('Template deleted successfully');
      handleCloseConfirm();

      if (page > 0 && dataInPage.length < 2) {
        setPage(page - 1);
      }
    } catch (error: any) {
      console.error(error);
      enqueueSnackbar(error.message || 'Failed to delete template', { variant: 'error' });
    }
  };

  const handleEditRow = (id: number) => {
    push(PATH_DASHBOARD.tiffin.labelEditorEdit(String(id)));
  };

  const handleSetDefault = async (id: number) => {
    try {
      await axios.put(`/api/label-templates/${id}/default`);
      enqueueSnackbar('Default template updated');
      fetchTemplates();
    } catch (error: any) {
      console.error(error);
      enqueueSnackbar(error.message || 'Failed to set default', { variant: 'error' });
    }
  };

  const handleDuplicate = async (template: LabelTemplate) => {
    try {
      const duplicateData = {
        name: `${template.name} (Copy)`,
        description: template.description,
        width_inches: template.width_inches,
        height_inches: template.height_inches,
        template_html: template.template_html,
        custom_placeholders: template.custom_placeholders,
        print_settings: template.print_settings,
        is_default: false,
      };
      await axios.post('/api/label-templates', duplicateData);
      enqueueSnackbar('Template duplicated successfully');
      fetchTemplates();
    } catch (error: any) {
      console.error(error);
      enqueueSnackbar(error.message || 'Failed to duplicate template', { variant: 'error' });
    }
  };

  return (
    <>
      <Head>
        <title>Label Templates | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Label Templates"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Label Templates' },
          ]}
          action={
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:plus-fill" />}
              onClick={() => push(PATH_DASHBOARD.tiffin.labelEditor)}
            >
              New Template
            </Button>
          }
        />

        <Card>
          <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
            <Scrollbar>
              <Table size={dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
                <TableHeadCustom
                  order={order}
                  orderBy={orderBy}
                  headLabel={TABLE_HEAD}
                  onSort={onSort}
                />

                <TableBody>
                  {dataInPage.map((row) => (
                    <LabelTemplateTableRow
                      key={row.id}
                      row={row}
                      onEditRow={() => handleEditRow(row.id)}
                      onDeleteRow={() => handleOpenConfirm(row.id)}
                      onSetDefault={() => handleSetDefault(row.id)}
                      onDuplicate={() => handleDuplicate(row)}
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
            count={tableData.length}
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
        content="Are you sure you want to delete this template?"
        action={
          <Button variant="contained" color="error" onClick={handleDeleteRow}>
            Delete
          </Button>
        }
      />
    </>
  );
}

// ----------------------------------------------------------------------

interface LabelTemplateTableRowProps {
  row: LabelTemplate;
  onEditRow: VoidFunction;
  onDeleteRow: VoidFunction;
  onSetDefault: VoidFunction;
  onDuplicate: VoidFunction;
}

function LabelTemplateTableRow({
  row,
  onEditRow,
  onDeleteRow,
  onSetDefault,
  onDuplicate,
}: LabelTemplateTableRowProps) {
  return (
    <tr>
      <td style={{ padding: '16px' }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Box>
            <Typography variant="subtitle2" noWrap>
              {row.name}
            </Typography>
          </Box>
        </Stack>
      </td>

      <td style={{ padding: '16px' }}>
        <Typography variant="body2" noWrap>
          {row.width_inches}" x {row.height_inches}"
        </Typography>
      </td>

      <td style={{ padding: '16px' }}>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 200 }}>
          {row.description || '-'}
        </Typography>
      </td>

      <td style={{ padding: '16px', textAlign: 'center' }}>
        {row.is_default ? (
          <Chip label="Default" color="primary" size="small" />
        ) : (
          <Button size="small" onClick={onSetDefault}>
            Set Default
          </Button>
        )}
      </td>

      <td style={{ padding: '16px', textAlign: 'right' }}>
        <Tooltip title="Edit">
          <IconButton onClick={onEditRow}>
            <Iconify icon="eva:edit-fill" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Duplicate">
          <IconButton onClick={onDuplicate}>
            <Iconify icon="eva:copy-fill" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Delete">
          <IconButton onClick={onDeleteRow} sx={{ color: 'error.main' }}>
            <Iconify icon="eva:trash-2-outline" />
          </IconButton>
        </Tooltip>
      </td>
    </tr>
  );
}
