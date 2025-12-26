import { useEffect, useState, useCallback } from 'react';
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
  TableHead,
  Stack,
  Chip,
  Box,
  TextField,
  Typography,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
// routes
import { PATH_DASHBOARD } from '../../../routes/paths';
// redux
import { useDispatch, useSelector } from '../../../redux/store';
import { getMonthlyTiffinList } from '../../../redux/slices/customerOrder';
// components
import Iconify from '../../../components/iconify';
import CustomBreadcrumbs from '../../../components/custom-breadcrumbs';
import Scrollbar from '../../../components/scrollbar';
import LoadingScreen from '../../../components/loading-screen';
import DashboardLayout from '../../../layouts/dashboard';
import { useSnackbar } from '../../../components/snackbar';
import axios from '../../../utils/axios';
// types
import { LabelTemplate, replacePlaceholders } from '../../../@types/label';

// ----------------------------------------------------------------------

MonthlyTiffinListPage.getLayout = (page: React.ReactElement) => (
  <DashboardLayout>{page}</DashboardLayout>
);

export default function MonthlyTiffinListPage() {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const { orders, isLoading } = useSelector((state) => state.customerOrder);

  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const monthStr = format(selectedMonth, 'yyyy-MM');
    dispatch(getMonthlyTiffinList(monthStr));
  }, [selectedMonth, dispatch]);

  // Fetch label templates
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await axios.get('/api/label-templates');
        if (response.data.success) {
          setTemplates(response.data.data);
          // Set default template
          const defaultTemplate = response.data.data.find((t: LabelTemplate) => t.is_default);
          if (defaultTemplate) {
            setSelectedTemplateId(defaultTemplate.id);
          } else if (response.data.data.length > 0) {
            setSelectedTemplateId(response.data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching templates:', error);
      }
    };
    fetchTemplates();
  }, []);

  // Get selected template
  const getTemplate = useCallback((): LabelTemplate | undefined => {
    return templates.find((t) => t.id === selectedTemplateId);
  }, [templates, selectedTemplateId]);

  // Calculate total labels (sum of quantities)
  const totalLabels = orders?.reduce((sum: number, order: any) => sum + (order.quantity || 1), 0) || 0;

  // Generate label HTML for a customer
  const generateLabelHtml = useCallback(
    (order: any, template: LabelTemplate, serialNumber: number): string => {
      const data: Record<string, string> = {
        customerName: order.customer_name,
        customerAddress: order.customer_address || '',
        customerPhone: order.customer_phone || '',
        currentDate: new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }),
        serialNumber: String(serialNumber).padStart(3, '0'),
        deliveryDate: format(selectedMonth, 'MMMM yyyy'),
        orderQuantity: String(order.quantity || 1),
        mealPlanName: order.meal_plan_name || '',
      };

      return replacePlaceholders(template.template_html, data);
    },
    [selectedMonth]
  );

  // Print all labels for the month
  const handlePrintAll = useCallback(() => {
    const template = getTemplate();
    if (!template) {
      enqueueSnackbar('Please select a label template', { variant: 'error' });
      return;
    }

    if (!orders || orders.length === 0) {
      enqueueSnackbar('No orders to print', { variant: 'warning' });
      return;
    }

    setIsPrinting(true);

    const { width_inches: widthIn, height_inches: heightIn } = template;
    const widthPx = Math.round(widthIn * 96);
    const heightPx = Math.round(heightIn * 96);

    // Generate labels for each customer, multiplied by quantity
    const labels: string[] = [];
    let serialNumber = 1;

    orders.forEach((order: any) => {
      // Print one label per quantity
      const qty = order.quantity || 1;
      for (let i = 0; i < qty; i++) {
        labels.push(generateLabelHtml(order, template, serialNumber));
        serialNumber++;
      }
    });

    // Generate HTML for each label using ql-editor class for Quill styling
    const labelsHtml = labels
      .map(
        (html) => `
      <div class="label">
        <div class="ql-editor">${html}</div>
      </div>
    `
      )
      .join('');

    // Full HTML document with Quill styles for consistency
    const printDocument = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Print Labels - ${format(selectedMonth, 'MMMM yyyy')}</title>
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
    /* Quill editor styles for consistency */
    .ql-editor {
      position: absolute;
      top: 0;
      left: 0;
      width: ${widthPx}px;
      height: ${heightPx}px;
      padding: 8px;
      overflow: hidden;
      font-family: Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.42;
      tab-size: 4;
    }
    .ql-editor p {
      margin: 0;
      padding: 0;
    }
    .ql-editor img {
      max-width: 100%;
    }
    /* Quill alignment classes */
    .ql-align-center {
      text-align: center;
    }
    .ql-align-right {
      text-align: right;
    }
    .ql-align-justify {
      text-align: justify;
    }
    /* Quill font sizes */
    .ql-size-small {
      font-size: 0.75em;
    }
    .ql-size-large {
      font-size: 1.5em;
    }
    .ql-size-huge {
      font-size: 2.5em;
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

    setIsPrinting(false);
  }, [getTemplate, orders, generateLabelHtml, selectedMonth, enqueueSnackbar]);

  return (
    <>
      <Head>
        <title>Monthly Tiffin List | TMS</title>
      </Head>

      <Container maxWidth={false}>
        <CustomBreadcrumbs
          heading="Monthly Tiffin List"
          links={[
            { name: 'Dashboard', href: PATH_DASHBOARD.root },
            { name: 'Tiffin', href: PATH_DASHBOARD.tiffin.root },
            { name: 'Monthly List' },
          ]}
        />

        <Card>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ p: 3 }}>
            <DatePicker
              label="Select Month"
              value={selectedMonth}
              onChange={(newDate) => newDate && setSelectedMonth(newDate)}
              views={['year', 'month']}
              renderInput={(params) => <TextField {...params} />}
            />

            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Total Orders: {orders?.length || 0} | Total Labels: {totalLabels}
            </Typography>

            <FormControl sx={{ minWidth: 200 }} size="small">
              <InputLabel>Label Template</InputLabel>
              <Select
                label="Label Template"
                value={selectedTemplateId || ''}
                onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              >
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name} ({template.width_inches}" x {template.height_inches}")
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:printer-fill" />}
              onClick={handlePrintAll}
              disabled={isPrinting || !orders?.length || !selectedTemplateId}
            >
              Print All Labels ({totalLabels})
            </Button>
          </Stack>

          {isLoading ? (
            <Box sx={{ p: 3 }}>
              <LoadingScreen />
            </Box>
          ) : (
            <TableContainer>
              <Scrollbar>
                <Table sx={{ minWidth: 1000 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center" sx={{ width: 80 }}>Print #</TableCell>
                      <TableCell>Customer Name</TableCell>
                      <TableCell>Meal Plan</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell>Selected Days</TableCell>
                      <TableCell align="right">Price (CAD $)</TableCell>
                      <TableCell>Period</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {orders && orders.map((order: any, index: number) => (
                      <TableRow key={index} hover>
                        <TableCell align="center">
                          <Typography variant="body2" color="text.secondary">
                            {order.print_order < 999999 ? order.print_order + 1 : '-'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle2">{order.customer_name}</Typography>
                          {order.customer_phone && (
                            <Typography variant="caption" color="text.secondary">
                              {order.customer_phone}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{order.meal_plan_name}</TableCell>
                        <TableCell align="center">{order.quantity}</TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {order.selected_days && order.selected_days.length > 0 ? (
                              order.selected_days.slice(0, 3).map((day: string) => (
                                <Chip key={day} label={day.substring(0, 3)} size="small" />
                              ))
                            ) : (
                              <Chip label="All" size="small" />
                            )}
                            {order.selected_days && order.selected_days.length > 3 && (
                              <Chip
                                label={`+${order.selected_days.length - 3}`}
                                size="small"
                                variant="outlined"
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell align="right">CAD ${Number(order.price).toFixed(2)}</TableCell>
                        <TableCell>
                          {format(new Date(order.start_date), 'dd MMM yyyy')} -{' '}
                          {format(new Date(order.end_date), 'dd MMM yyyy')}
                        </TableCell>
                      </TableRow>
                    ))}

                    {(!orders || !orders.length) && (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          <Typography variant="body2" color="text.secondary">
                            No orders for this month
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Scrollbar>
            </TableContainer>
          )}
        </Card>
      </Container>
    </>
  );
}
