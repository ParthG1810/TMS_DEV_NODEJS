import { useState, useEffect } from 'react';
// @mui
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
  Divider,
  Paper,
  Chip,
  CircularProgress,
  IconButton,
  Grid,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';
// utils
import axios from '../../../../utils/axios';

// ----------------------------------------------------------------------

const CalendarDay = styled(Box)<{ status?: string; isPlanDay?: boolean }>(
  ({ theme, status, isPlanDay }) => ({
    width: '100%',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
    position: 'relative',
    backgroundColor: status
      ? status === 'T'
        ? alpha(theme.palette.success.main, 0.12)
        : status === 'A'
        ? alpha(theme.palette.error.main, 0.12)
        : status === 'E'
        ? alpha(theme.palette.info.main, 0.12)
        : theme.palette.background.paper
      : isPlanDay
      ? alpha(theme.palette.grey[400], 0.05)
      : theme.palette.background.paper,
  })
);

const DayNumber = styled(Typography)<{ status?: string }>(({ theme, status }) => ({
  fontSize: 13,
  fontWeight: 500,
  color: status
    ? status === 'T'
      ? theme.palette.success.dark
      : status === 'A'
      ? theme.palette.error.dark
      : status === 'E'
      ? theme.palette.info.dark
      : theme.palette.text.primary
    : theme.palette.text.primary,
}));

const StatusIcon = styled(Box)<{ status: string }>(({ theme, status }) => ({
  position: 'absolute',
  bottom: 2,
  right: 2,
  fontSize: 14,
  fontWeight: 'bold',
  color:
    status === 'T'
      ? theme.palette.success.main
      : status === 'A'
      ? theme.palette.error.main
      : theme.palette.info.main,
}));

const CalculationRow = styled(Box)(({ theme }) => ({
  paddingLeft: theme.spacing(2),
  paddingTop: theme.spacing(0.5),
  paddingBottom: theme.spacing(0.5),
  position: 'relative',
  '&::before': {
    content: '"├─"',
    position: 'absolute',
    left: 0,
    color: theme.palette.text.disabled,
  },
  '&:last-child::before': {
    content: '"└─"',
  },
}));

// ----------------------------------------------------------------------

interface CalendarEntry {
  delivery_date: string;
  status: 'T' | 'A' | 'E';
  quantity: number;
  price: number;
}

interface OrderInvoice {
  order_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  billing_month: string;
  meal_plan_name: string;
  meal_plan_price: number;
  start_date: string;
  end_date: string;
  selected_days: string[];
  billing: {
    total_delivered: number;
    total_absent: number;
    total_extra: number;
    total_plan_days: number;
    base_amount: number;
    extra_amount: number;
    total_amount: number;
    status: 'calculating' | 'finalized';
    finalized_at: string | null;
    finalized_by: string | null;
  };
  calendar_entries: CalendarEntry[];
}

interface OrderInvoiceDialogProps {
  open: boolean;
  onClose: () => void;
  orderId: number;
  billingMonth: string;
  onViewCombined?: () => void;
}

export default function OrderInvoiceDialog({
  open,
  onClose,
  orderId,
  billingMonth,
  onViewCombined,
}: OrderInvoiceDialogProps) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<OrderInvoice | null>(null);

  // Fetch order invoice data
  useEffect(() => {
    if (open && orderId && billingMonth) {
      fetchInvoice();
    }
  }, [open, orderId, billingMonth]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/order-billing/order-invoice', {
        params: {
          order_id: orderId,
          billing_month: billingMonth,
        },
      });

      if (response.data.success) {
        setInvoice(response.data.data);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to load invoice', { variant: 'error' });
      }
    } catch (error: any) {
      console.error('Error fetching order invoice:', error);
      enqueueSnackbar(error.response?.data?.error || 'Failed to load invoice', {
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `CAD $${amount.toFixed(2)}`;
  };

  // Parse billing month for display
  const getMonthDisplay = () => {
    if (!billingMonth) return '';
    const [year, month] = billingMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    if (!invoice || !billingMonth) return [];

    const [year, month] = billingMonth.split('-').map(Number);
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Create entry lookup map
    const entryMap = new Map<string, CalendarEntry>();
    invoice.calendar_entries.forEach((entry) => {
      const date = new Date(entry.delivery_date);
      const day = date.getDate();
      entryMap.set(day.toString(), entry);
    });

    // Get selected days for this order
    const selectedDaysMap = new Map<number, boolean>();
    const dayNameToNumber: { [key: string]: number } = {
      Sunday: 0,
      Monday: 1,
      Tuesday: 2,
      Wednesday: 3,
      Thursday: 4,
      Friday: 5,
      Saturday: 6,
    };

    invoice.selected_days.forEach((dayName) => {
      const dayNum = dayNameToNumber[dayName];
      if (dayNum !== undefined) {
        selectedDaysMap.set(dayNum, true);
      }
    });

    const days = [];

    // Add empty cells for days before the month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ day: null, entry: null, isPlanDay: false });
    }

    // Add actual days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const dayOfWeek = currentDate.getDay();
      const isPlanDay = selectedDaysMap.has(dayOfWeek);
      const entry = entryMap.get(day.toString());

      days.push({
        day,
        entry: entry || null,
        isPlanDay,
      });
    }

    return days;
  };

  const perTiffinPrice =
    invoice && invoice.billing.total_plan_days > 0
      ? invoice.meal_plan_price / invoice.billing.total_plan_days
      : 0;

  const deliveredAmount = invoice ? invoice.billing.total_delivered * perTiffinPrice : 0;
  const absentDeduction = invoice ? invoice.billing.total_absent * perTiffinPrice : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack>
            <Typography variant="h5">Order Invoice</Typography>
            {invoice && (
              <Typography variant="body2" color="text.secondary">
                {invoice.customer_name} - {invoice.meal_plan_name} - {getMonthDisplay()}
              </Typography>
            )}
          </Stack>
          <IconButton onClick={onClose} size="small">
            <Iconify icon="eva:close-fill" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
            <CircularProgress />
          </Box>
        ) : invoice ? (
          <Grid container spacing={3}>
            {/* Left Half: Calendar View */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Delivery Calendar
                </Typography>

                {/* Day headers */}
                <Grid container spacing={0.5} sx={{ mb: 1 }}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Grid item xs key={day}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        textAlign="center"
                        display="block"
                      >
                        {day}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>

                {/* Calendar days */}
                <Grid container spacing={0.5}>
                  {generateCalendarDays().map((item, index) => (
                    <Grid item xs key={index}>
                      <CalendarDay status={item.entry?.status} isPlanDay={item.isPlanDay}>
                        {item.day && (
                          <>
                            <DayNumber status={item.entry?.status}>{item.day}</DayNumber>
                            {item.entry && (
                              <StatusIcon status={item.entry.status}>
                                {item.entry.status === 'T'
                                  ? '✓'
                                  : item.entry.status === 'A'
                                  ? '✗'
                                  : '+'}
                              </StatusIcon>
                            )}
                          </>
                        )}
                      </CalendarDay>
                    </Grid>
                  ))}
                </Grid>

                {/* Summary */}
                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                  <Chip
                    label={`${invoice.billing.total_delivered} Delivered`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#00AB55', 0.12),
                      color: '#00AB55',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`${invoice.billing.total_absent} Absent`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#FF5630', 0.12),
                      color: '#FF5630',
                      fontWeight: 600,
                    }}
                  />
                  <Chip
                    label={`${invoice.billing.total_extra} Extra`}
                    size="small"
                    sx={{
                      bgcolor: alpha('#00B8D9', 0.12),
                      color: '#00B8D9',
                      fontWeight: 600,
                    }}
                  />
                </Stack>
              </Paper>
            </Grid>

            {/* Right Half: Billing Calculation */}
            <Grid item xs={12} md={6}>
              <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                  Billing Calculation Breakdown
                </Typography>

                <Stack spacing={2}>
                  {/* Base Order */}
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom>
                      Base Order: {invoice.meal_plan_name}
                    </Typography>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Order Price: {formatCurrency(invoice.meal_plan_price)}
                      </Typography>
                    </CalculationRow>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Total {invoice.selected_days.join('-')} days in{' '}
                        {getMonthDisplay().split(' ')[0]}: {invoice.billing.total_plan_days} days
                      </Typography>
                    </CalculationRow>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Per-Tiffin Price: {formatCurrency(invoice.meal_plan_price)} ÷{' '}
                        {invoice.billing.total_plan_days} = {formatCurrency(perTiffinPrice)}
                        /tiffin
                      </Typography>
                    </CalculationRow>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Order covers: {new Date(invoice.start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        -{' '}
                        {new Date(invoice.end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Typography>
                    </CalculationRow>
                  </Box>

                  <Divider />

                  {/* Delivered Tiffins */}
                  <Box>
                    <Typography variant="body2" fontWeight={600} gutterBottom color="success.main">
                      Delivered Tiffins
                    </Typography>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Count: {invoice.billing.total_delivered} tiffins delivered
                      </Typography>
                    </CalculationRow>
                    <CalculationRow>
                      <Typography variant="caption" color="text.secondary">
                        Calculation: {invoice.billing.total_delivered} × {formatCurrency(perTiffinPrice)} ={' '}
                        {formatCurrency(deliveredAmount)}
                      </Typography>
                    </CalculationRow>
                    <CalculationRow>
                      <Typography variant="caption" fontWeight={600} color="success.main">
                        Subtotal: {formatCurrency(deliveredAmount)}
                      </Typography>
                    </CalculationRow>
                  </Box>

                  <Divider />

                  {/* Absent Days */}
                  {invoice.billing.total_absent > 0 && (
                    <>
                      <Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom color="error.main">
                          Absent Days (Deduction)
                        </Typography>
                        <CalculationRow>
                          <Typography variant="caption" color="text.secondary">
                            Count: {invoice.billing.total_absent} day(s) absent
                          </Typography>
                        </CalculationRow>
                        <CalculationRow>
                          <Typography variant="caption" color="text.secondary">
                            Calculation: {invoice.billing.total_absent} ×{' '}
                            {formatCurrency(perTiffinPrice)} = -{formatCurrency(absentDeduction)}
                          </Typography>
                        </CalculationRow>
                        <CalculationRow>
                          <Typography variant="caption" fontWeight={600} color="error.main">
                            Deduction: -{formatCurrency(absentDeduction)}
                          </Typography>
                        </CalculationRow>
                      </Box>
                      <Divider />
                    </>
                  )}

                  {/* Extra Tiffins */}
                  {invoice.billing.total_extra > 0 && (
                    <>
                      <Box>
                        <Typography variant="body2" fontWeight={600} gutterBottom color="info.main">
                          Extra Tiffins
                        </Typography>
                        <CalculationRow>
                          <Typography variant="caption" color="text.secondary">
                            Count: {invoice.billing.total_extra} extra tiffin(s)
                          </Typography>
                        </CalculationRow>
                        <CalculationRow>
                          <Typography variant="caption" color="text.secondary">
                            Price: {formatCurrency(invoice.billing.extra_amount / invoice.billing.total_extra)}/tiffin
                          </Typography>
                        </CalculationRow>
                        <CalculationRow>
                          <Typography variant="caption" fontWeight={600} color="info.main">
                            Addition: +{formatCurrency(invoice.billing.extra_amount)}
                          </Typography>
                        </CalculationRow>
                      </Box>
                      <Divider />
                    </>
                  )}

                  {/* Final Total */}
                  <Box
                    sx={{
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                      p: 2,
                      borderRadius: 1,
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6" fontWeight={700}>
                        Total Amount
                      </Typography>
                      <Typography variant="h4" color="primary.main" fontWeight={700}>
                        {formatCurrency(invoice.billing.total_amount)}
                      </Typography>
                    </Stack>
                    <Stack
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                      spacing={1}
                      sx={{ mt: 1 }}
                    >
                      <Chip
                        label={invoice.billing.status === 'finalized' ? 'Finalized' : 'Calculating'}
                        color={invoice.billing.status === 'finalized' ? 'success' : 'warning'}
                        size="small"
                      />
                      {invoice.billing.finalized_at && (
                        <Typography variant="caption" color="text.secondary">
                          on {new Date(invoice.billing.finalized_at).toLocaleDateString()}
                        </Typography>
                      )}
                    </Stack>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ py: 5, textAlign: 'center' }}>
            <Typography color="text.secondary">No invoice data found</Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {onViewCombined && invoice && (
          <Button
            variant="outlined"
            color="primary"
            onClick={onViewCombined}
            startIcon={<Iconify icon="eva:layers-outline" />}
          >
            View Combined Invoice
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
