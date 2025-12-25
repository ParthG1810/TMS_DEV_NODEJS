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
  Typography,
  Stack,
  Chip,
  Box,
  Divider,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import { LabelTemplate, CreateLabelTemplateRequest } from '../../../@types/label';
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

// Export template to JSON file
const exportTemplateToJson = (template: LabelTemplate) => {
  const exportData = {
    name: template.name,
    description: template.description,
    width_inches: template.width_inches,
    height_inches: template.height_inches,
    template_html: template.template_html,
    custom_placeholders: template.custom_placeholders,
    print_settings: template.print_settings,
    exported_at: new Date().toISOString(),
    version: '1.0',
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `label-template-${template.name.toLowerCase().replace(/\s+/g, '-')}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Export all templates to a single JSON file
const exportAllTemplatesToJson = (templates: LabelTemplate[]) => {
  const exportData = {
    templates: templates.map((template) => ({
      name: template.name,
      description: template.description,
      width_inches: template.width_inches,
      height_inches: template.height_inches,
      template_html: template.template_html,
      custom_placeholders: template.custom_placeholders,
      print_settings: template.print_settings,
      is_default: template.is_default,
    })),
    exported_at: new Date().toISOString(),
    version: '1.0',
    count: templates.length,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `label-templates-backup-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

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
  const [isImporting, setIsImporting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Export single template
  const handleExportTemplate = (template: LabelTemplate) => {
    exportTemplateToJson(template);
    enqueueSnackbar(`Template "${template.name}" exported successfully`);
  };

  // Export all templates
  const handleExportAll = () => {
    if (tableData.length === 0) {
      enqueueSnackbar('No templates to export', { variant: 'warning' });
      return;
    }
    exportAllTemplatesToJson(tableData);
    enqueueSnackbar(`Exported ${tableData.length} template(s) successfully`);
  };

  // Import templates
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Reset input
    event.target.value = '';

    if (!file.name.endsWith('.json')) {
      enqueueSnackbar('Please select a JSON file', { variant: 'error' });
      return;
    }

    setIsImporting(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      let templatesToImport: CreateLabelTemplateRequest[] = [];

      // Check if it's a single template or multiple templates
      if (data.templates && Array.isArray(data.templates)) {
        // Multiple templates export format
        templatesToImport = data.templates.map((t: any) => ({
          name: t.name,
          description: t.description,
          width_inches: t.width_inches,
          height_inches: t.height_inches,
          template_html: t.template_html,
          custom_placeholders: t.custom_placeholders,
          print_settings: t.print_settings,
          is_default: false, // Don't import as default
        }));
      } else if (data.name && data.template_html) {
        // Single template export format
        templatesToImport = [{
          name: data.name,
          description: data.description,
          width_inches: data.width_inches,
          height_inches: data.height_inches,
          template_html: data.template_html,
          custom_placeholders: data.custom_placeholders,
          print_settings: data.print_settings,
          is_default: false,
        }];
      } else {
        enqueueSnackbar('Invalid template format', { variant: 'error' });
        setIsImporting(false);
        return;
      }

      // Validate templates
      for (const template of templatesToImport) {
        if (!template.name || !template.template_html || !template.width_inches || !template.height_inches) {
          enqueueSnackbar('Invalid template data: missing required fields', { variant: 'error' });
          setIsImporting(false);
          return;
        }
      }

      // Import each template
      let successCount = 0;
      let errorCount = 0;

      for (const template of templatesToImport) {
        try {
          // Check for duplicate names and append suffix
          const existingNames = tableData.map((t) => t.name.toLowerCase());
          let finalName = template.name;
          let suffix = 1;
          while (existingNames.includes(finalName.toLowerCase())) {
            finalName = `${template.name} (Imported ${suffix})`;
            suffix++;
          }
          template.name = finalName;

          await axios.post('/api/label-templates', template);
          successCount++;
        } catch (error) {
          console.error('Error importing template:', error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        enqueueSnackbar(`Successfully imported ${successCount} template(s)`, { variant: 'success' });
        fetchTemplates();
      }
      if (errorCount > 0) {
        enqueueSnackbar(`Failed to import ${errorCount} template(s)`, { variant: 'warning' });
      }
    } catch (error: any) {
      console.error('Import error:', error);
      enqueueSnackbar('Failed to parse JSON file', { variant: 'error' });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Label Templates | TMS</title>
      </Head>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Label Templates"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Label Templates' },
          ]}
          action={
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:download-fill" />}
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : 'Import'}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Iconify icon="eva:upload-fill" />}
                onClick={handleExportAll}
                disabled={tableData.length === 0}
              >
                Export All
              </Button>
              <Button
                variant="contained"
                startIcon={<Iconify icon="eva:plus-fill" />}
                onClick={() => push(PATH_DASHBOARD.tiffin.labelEditor)}
              >
                New Template
              </Button>
            </Stack>
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
                      onExport={() => handleExportTemplate(row)}
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
  onExport: VoidFunction;
}

function LabelTemplateTableRow({
  row,
  onEditRow,
  onDeleteRow,
  onSetDefault,
  onDuplicate,
  onExport,
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

        <Tooltip title="Export">
          <IconButton onClick={onExport}>
            <Iconify icon="eva:download-fill" />
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
