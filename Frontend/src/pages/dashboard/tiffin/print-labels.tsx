import { useEffect, useState, useCallback } from 'react';
import Head from 'next/head';
// @mui
import {
  Card,
  CardHeader,
  CardContent,
  Button,
  Container,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Typography,
  Box,
  Paper,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Divider,
  TextField,
  Autocomplete,
} from '@mui/material';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// @types
import {
  LabelTemplate,
  CustomerWithPrintOrder,
  CustomerForPrint,
  replacePlaceholders,
  inchesToPixels,
} from '../../../@types/label';
// components
import Iconify from '../../../components/iconify';
import Scrollbar from '../../../components/scrollbar';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import { useSnackbar } from '../../../components/snackbar';
import DashboardLayout from '../../../layouts/dashboard';
import axios from '../../../utils/axios';

// ----------------------------------------------------------------------

PrintLabelsPage.getLayout = (page: React.ReactElement) => <DashboardLayout>{page}</DashboardLayout>;

export default function PrintLabelsPage() {
  const { enqueueSnackbar } = useSnackbar();

  // Data state
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [customers, setCustomers] = useState<CustomerForPrint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Single print state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Bulk print state
  const [bulkTemplateId, setBulkTemplateId] = useState<number | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [templatesRes, customersRes] = await Promise.all([
        axios.get('/api/label-templates'),
        axios.get('/api/customer-print-order'),
      ]);

      if (templatesRes.data.success) {
        setTemplates(templatesRes.data.data);
        // Set default template
        const defaultTemplate = templatesRes.data.data.find((t: LabelTemplate) => t.is_default);
        if (defaultTemplate) {
          setSelectedTemplateId(defaultTemplate.id);
          setBulkTemplateId(defaultTemplate.id);
        }
      }

      if (customersRes.data.success) {
        const customersWithPrint = customersRes.data.data.map((c: CustomerWithPrintOrder) => ({
          ...c,
          copies: 1,
          selected: false,
        }));
        setCustomers(customersWithPrint);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      enqueueSnackbar('Failed to load data', { variant: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // Get selected template
  const getTemplate = (templateId: number | null): LabelTemplate | undefined => {
    return templates.find((t) => t.id === templateId);
  };

  // Generate label HTML for a customer
  const generateLabelHtml = useCallback(
    (customer: CustomerForPrint, template: LabelTemplate, serialNumber: number): string => {
      const data: Record<string, string> = {
        customerName: customer.name,
        customerAddress: customer.address,
        customerPhone: customer.phone || '',
        currentDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        serialNumber: String(serialNumber).padStart(3, '0'),
        deliveryDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        orderQuantity: '1',
        mealPlanName: '',
      };

      return replacePlaceholders(template.template_html, data);
    },
    []
  );

  // Custom print function using window.open
  const printLabels = (labels: string[], template: LabelTemplate) => {
    const { width_inches: widthIn, height_inches: heightIn } = template;
    const widthPx = Math.round(widthIn * 96);
    const heightPx = Math.round(heightIn * 96);

    // Generate HTML for each label
    const labelsHtml = labels
      .map(
        (html) => `
      <div class="label">
        <div class="label-content">${html}</div>
      </div>
    `
      )
      .join('');

    // Full HTML document
    const printDocument = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Labels</title>
  <style>
    @page {
      size: ${widthIn}in ${heightIn}in;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    html, body {
      width: ${widthIn}in;
      height: auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .label {
      width: ${widthPx}px;
      height: ${heightPx}px;
      overflow: hidden;
      position: relative;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .label:last-child {
      page-break-after: auto;
    }
    .label-content {
      position: absolute;
      top: 0;
      left: 0;
      width: ${widthPx}px;
      height: ${heightPx}px;
      padding: 8px;
      overflow: hidden;
      line-height: 1.2;
    }
    .label-content p {
      margin: 0;
      padding: 0;
      line-height: 1.2;
    }
    .label-content img {
      max-width: 100%;
      display: block;
      margin: 0 auto;
    }
  </style>
</head>
<body>
  ${labelsHtml}
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() {
        window.close();
      };
    };
  </script>
</body>
</html>
    `;

    // Open new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printDocument);
      printWindow.document.close();
    }
  };

  // Handle single print
  const handleSinglePrint = () => {
    const template = getTemplate(selectedTemplateId);
    const customer = customers.find((c) => c.id === selectedCustomerId);
    if (template && customer) {
      const labelHtml = generateLabelHtml(customer, template, 1);
      printLabels([labelHtml], template);
    }
  };

  // Handle bulk print
  const handleBulkPrint = () => {
    const template = getTemplate(bulkTemplateId);
    if (!template) return;

    const labels: string[] = [];
    let serialNumber = 1;

    customers
      .filter((c) => c.selected)
      .forEach((customer) => {
        for (let i = 0; i < customer.copies; i++) {
          labels.push(generateLabelHtml(customer, template, serialNumber));
          serialNumber++;
        }
      });

    if (labels.length > 0) {
      printLabels(labels, template);
    }
  };

  // Toggle select all
  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    setCustomers((prev) =>
      prev.map((c) => ({
        ...c,
        selected: checked,
      }))
    );
  };

  // Toggle single customer
  const handleToggleCustomer = (id: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, selected: !c.selected } : c
      )
    );
  };

  // Update copies
  const handleCopiesChange = (id: number, delta: number) => {
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, copies: Math.max(1, c.copies + delta) } : c
      )
    );
  };

  // Get selected stats
  const selectedCustomers = customers.filter((c) => c.selected);
  const totalLabels = selectedCustomers.reduce((sum, c) => sum + c.copies, 0);

  // Get selected customer for single print
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedTemplate = getTemplate(selectedTemplateId);

  return (
    <>
      <Head>
        <title>Print Labels | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Print Labels"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Print Labels' },
          ]}
        />

        {/* SECTION 1: Print Single Label */}
        <Card sx={{ mb: 4 }}>
          <CardHeader
            title="Print Single Label"
            subheader="Select a customer and template to print one label"
          />
          <CardContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => `${option.name} - ${option.address}`}
                    value={selectedCustomer || null}
                    onChange={(e, newValue) => setSelectedCustomerId(newValue?.id || null)}
                    renderInput={(params) => (
                      <TextField {...params} label="Select Customer" />
                    )}
                    loading={isLoading}
                  />

                  <FormControl fullWidth>
                    <InputLabel>Label Template</InputLabel>
                    <Select
                      label="Label Template"
                      value={selectedTemplateId || ''}
                      onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
                    >
                      {templates.map((template) => (
                        <MenuItem key={template.id} value={template.id}>
                          {template.name} ({template.width_inches}" x {template.height_inches}")
                          {template.is_default && ' (Default)'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Iconify icon="eva:printer-fill" />}
                    onClick={() => handleSinglePrint()}
                    disabled={!selectedCustomerId || !selectedTemplateId}
                  >
                    Print Label
                  </Button>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>
                  Preview
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'grey.50',
                    minHeight: 200,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {selectedCustomer && selectedTemplate ? (
                    <Box
                      sx={{
                        width: inchesToPixels(selectedTemplate.width_inches),
                        height: inchesToPixels(selectedTemplate.height_inches),
                        border: '2px solid #1976d2',
                        borderRadius: '8px',
                        bgcolor: 'white',
                        overflow: 'hidden',
                        boxShadow: '0 0 0 4px rgba(25, 118, 210, 0.1)',
                        boxSizing: 'border-box',
                        position: 'relative',
                      }}
                    >
                      <Box
                        className="ql-editor"
                        sx={{
                          width: '100%',
                          height: '100%',
                          padding: '8px !important',
                          overflow: 'hidden !important',
                          boxSizing: 'border-box',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          '& p': {
                            margin: '0 !important',
                            padding: '0 !important',
                          },
                          '& img': {
                            maxWidth: '100%',
                          },
                        }}
                        dangerouslySetInnerHTML={{
                          __html: generateLabelHtml(selectedCustomer, selectedTemplate, 1),
                        }}
                      />
                    </Box>
                  ) : (
                    <Typography color="text.secondary">
                      Select a customer and template to preview
                    </Typography>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Divider sx={{ my: 4 }} />

        {/* SECTION 2: Print Multiple Labels */}
        <Card>
          <CardHeader
            title="Print Multiple Labels"
            subheader="Select multiple customers and set copies for each"
            action={
              <FormControl sx={{ minWidth: 250 }}>
                <InputLabel>Label Template</InputLabel>
                <Select
                  label="Label Template"
                  value={bulkTemplateId || ''}
                  onChange={(e) => setBulkTemplateId(Number(e.target.value))}
                  size="small"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.name} ({template.width_inches}" x {template.height_inches}")
                      {template.is_default && ' (Default)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            }
          />
          <CardContent>
            <TableContainer>
              <Scrollbar>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectAll}
                          indeterminate={
                            selectedCustomers.length > 0 &&
                            selectedCustomers.length < customers.length
                          }
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      </TableCell>
                      <TableCell>#</TableCell>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Address</TableCell>
                      <TableCell align="center">Copies</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customers.map((customer, index) => (
                      <TableRow
                        key={customer.id}
                        hover
                        selected={customer.selected}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={customer.selected}
                            onChange={() => handleToggleCustomer(customer.id)}
                          />
                        </TableCell>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{customer.name}</Typography>
                          {customer.phone && (
                            <Typography variant="caption" color="text.secondary">
                              {customer.phone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                            {customer.address}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1}>
                            <IconButton
                              size="small"
                              onClick={() => handleCopiesChange(customer.id, -1)}
                              disabled={customer.copies <= 1}
                            >
                              <Iconify icon="eva:minus-fill" />
                            </IconButton>
                            <Typography sx={{ minWidth: 30, textAlign: 'center' }}>
                              {customer.copies}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() => handleCopiesChange(customer.id, 1)}
                            >
                              <Iconify icon="eva:plus-fill" />
                            </IconButton>
                          </Stack>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Scrollbar>
            </TableContainer>

            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  onClick={() => handleSelectAll(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => handleSelectAll(false)}
                >
                  Deselect All
                </Button>
              </Stack>

              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  Selected: {selectedCustomers.length} customers | Total Labels: {totalLabels}
                </Typography>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<Iconify icon="eva:printer-fill" />}
                  onClick={() => handleBulkPrint()}
                  disabled={selectedCustomers.length === 0 || !bulkTemplateId}
                >
                  Print Selected Labels ({totalLabels})
                </Button>
              </Stack>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
