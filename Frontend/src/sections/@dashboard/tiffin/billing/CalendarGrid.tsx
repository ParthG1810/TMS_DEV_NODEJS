import { useState, useEffect } from 'react';
// @mui
import {
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Typography,
  IconButton,
  Button,
  Stack,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  TextField,
  MenuItem,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
// components
import Iconify from '../../../../components/iconify';
import { useSnackbar } from '../../../../components/snackbar';
// utils
import axios from '../../../../utils/axios';
// redux
import { useDispatch } from '../../../../redux/store';
import { createCalendarEntry, finalizeBilling } from '../../../../redux/slices/payment';
// types
import { ICalendarCustomerData, CalendarEntryStatus } from '../../../../@types/tms';

// ----------------------------------------------------------------------

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(0.25),
  textAlign: 'center',
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:first-of-type': {
    position: 'sticky',
    left: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
    minWidth: 90,
    maxWidth: 90,
    width: 90,
    borderRight: `2px solid ${theme.palette.divider}`,
    textAlign: 'left',
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
    whiteSpace: 'normal',
    wordWrap: 'break-word',
    overflow: 'hidden',
  },
  '&:last-child': {
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
    minWidth: 100,
    borderLeft: `2px solid ${theme.palette.divider}`,
  },
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(0.5, 0.25),
  textAlign: 'center',
  fontWeight: 'bold',
  fontSize: 11,
  backgroundColor: theme.palette.grey[200],
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:first-of-type': {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    minWidth: 90,
    maxWidth: 90,
    width: 90,
    borderRight: `2px solid ${theme.palette.divider}`,
    textAlign: 'left',
    paddingLeft: theme.spacing(0.5),
    paddingRight: theme.spacing(0.5),
    whiteSpace: 'normal',
    wordWrap: 'break-word',
  },
  '&:last-child': {
    position: 'sticky',
    right: 0,
    zIndex: 3,
    minWidth: 100,
    borderLeft: `2px solid ${theme.palette.divider}`,
  },
}));

interface DayCellProps {
  status: CalendarEntryStatus | null;
  onClick: () => void;
  onDoubleClick?: () => void;
  isWeekend: boolean;
  disabled?: boolean;
  isPlanDay?: boolean; // Whether this day is covered by a plan order
}

const DayCell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status' && prop !== 'isWeekend' && prop !== 'disabled' && prop !== 'isPlanDay',
})<DayCellProps>(({ theme, status, isWeekend, disabled, isPlanDay }) => ({
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? (isPlanDay ? 'not-allowed' : 'pointer') : 'pointer',
  borderRadius: theme.spacing(0.5),
  fontSize: 10,
  fontWeight: 'bold',
  transition: 'all 0.15s',
  opacity: disabled && !isPlanDay ? 0.3 : 1,
  backgroundColor: disabled && !isPlanDay
    ? alpha(theme.palette.grey[300], 0.2)
    : !status
    ? isPlanDay
      ? alpha(theme.palette.warning.light, 0.15) // Light yellow/orange for blank plan days
      : isWeekend
      ? alpha(theme.palette.grey[300], 0.3)
      : 'transparent'
    : status === 'T'
    ? theme.palette.success.main
    : status === 'A'
    ? theme.palette.error.main // Red for absent
    : theme.palette.info.main,
  color: disabled && !isPlanDay
    ? theme.palette.text.disabled
    : status
    ? 'white'
    : isPlanDay
    ? theme.palette.warning.dark
    : theme.palette.text.primary,
  border: isPlanDay && !status
    ? `2px dashed ${theme.palette.warning.main}` // Dashed border for blank plan days
    : `1px solid ${theme.palette.divider}`,
  '&:hover': disabled && !isPlanDay
    ? {}
    : {
        transform: 'scale(1.15)',
        boxShadow: theme.shadows[3],
        zIndex: 1,
      },
}));

// ----------------------------------------------------------------------

interface CalendarGridProps {
  year: number;
  month: number; // 1-12
  customers: ICalendarCustomerData[];
  onUpdate: () => void;
}

export default function CalendarGrid({ year, month, customers, onUpdate }: CalendarGridProps) {
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedCustomer, setSelectedCustomer] = useState<ICalendarCustomerData | null>(null);
  const [openFinalizeDialog, setOpenFinalizeDialog] = useState(false);
  const [finalizingCustomerId, setFinalizingCustomerId] = useState<number | null>(null);

  // Extra tiffin order dialog state
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [extraOrderData, setExtraOrderData] = useState<{
    customer_id: number;
    customer_name: string;
    delivery_date: string;
    order_id: number;
  } | null>(null);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(null);
  const [extraPrice, setExtraPrice] = useState<string>('');

  // Fetch meal plans on component mount
  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        const response = await axios.get('/api/meal-plans');
        setMealPlans(response.data.data || []);
      } catch (error) {
        console.error('Error fetching meal plans:', error);
      }
    };
    fetchMealPlans();
  }, []);

  // Auto-populate price when meal plan is selected
  useEffect(() => {
    if (selectedMealPlan && mealPlans.length > 0) {
      const selectedPlan = mealPlans.find((plan) => plan.id === selectedMealPlan);
      if (selectedPlan && selectedPlan.price) {
        setExtraPrice(Number(selectedPlan.price).toFixed(2));
      }
    }
  }, [selectedMealPlan, mealPlans]);

  // Get number of days in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Get day of week for each date (0 = Sunday, 6 = Saturday)
  const getDayOfWeek = (day: number) => {
    return new Date(year, month - 1, day).getDay();
  };

  const isWeekend = (day: number) => {
    const dayOfWeek = getDayOfWeek(day);
    return dayOfWeek === 0 || dayOfWeek === 6;
  };

  // Helper to parse YYYY-MM-DD date strings without timezone conversion
  const parseDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  // Check if a date is covered by any order for the customer
  const isDateCoveredByOrder = (customer: ICalendarCustomerData, day: number): boolean => {
    if (!customer.orders || customer.orders.length === 0) {
      return false;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(year, month - 1, day); // Parse in local timezone
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    return customer.orders.some((order) => {
      const startDate = parseDate(order.start_date); // Parse without timezone conversion
      const endDate = parseDate(order.end_date); // Parse without timezone conversion
      const isInDateRange = currentDate >= startDate && currentDate <= endDate;

      // If order doesn't have selected_days, it covers all days in the range
      if (!order.selected_days || order.selected_days.length === 0) {
        return isInDateRange;
      }

      // Check if the current day of week is in the selected_days array
      return isInDateRange && order.selected_days.includes(dayName);
    });
  };

  const handleCellClick = async (
    customer: ICalendarCustomerData,
    day: number,
    currentStatus: CalendarEntryStatus | null,
    isPlanDay: boolean
  ) => {
    // Get customer's orders
    const orders = customer.orders || [];
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Find an order that covers this date
    const activeOrder = orders.find((order) => {
      const startDate = new Date(order.start_date);
      const endDate = new Date(order.end_date);
      const currentDate = new Date(date);
      return currentDate >= startDate && currentDate <= endDate;
    });

    // For plan days: cycle through Blank → T → A → Blank
    if (isPlanDay && activeOrder) {
      // Determine next status in the cycle
      let newStatus: CalendarEntryStatus | null = null;
      let shouldDelete = false;

      if (!currentStatus) {
        // Blank → T
        newStatus = 'T';
      } else if (currentStatus === 'T') {
        // T → A
        newStatus = 'A';
      } else if (currentStatus === 'A') {
        // A → Blank (delete entry)
        shouldDelete = true;
      }

      try {
        if (shouldDelete) {
          // Delete the entry to clear it
          await axios.delete('/api/calendar-entries', {
            params: {
              customer_id: customer.customer_id,
              delivery_date: date,
            },
          });
          enqueueSnackbar('Status cleared', { variant: 'info' });
        } else if (newStatus) {
          // Create or update entry
          const result = await dispatch(
            createCalendarEntry({
              customer_id: customer.customer_id,
              order_id: activeOrder.id,
              delivery_date: date,
              status: newStatus,
              quantity: 1,
              price: 0, // Price will be calculated by the stored procedure
            })
          );

          if (result.success) {
            enqueueSnackbar(`Marked as ${newStatus === 'T' ? 'Delivered' : 'Absent'}`, {
              variant: 'success'
            });
          } else {
            enqueueSnackbar(result.error || 'Failed to update entry', { variant: 'error' });
          }
        }

        // Revert billing status if it was finalized
        await revertBillingIfFinalized(customer);

        onUpdate(); // Refresh the calendar
      } catch (error) {
        console.error('Error updating calendar entry:', error);
        enqueueSnackbar('Failed to update entry', { variant: 'error' });
      }
    }

    // For non-plan days with 'E' status: remove the entry and delete the order
    if (!isPlanDay && currentStatus === 'E') {
      try {
        // First, get the calendar entry to find the order_id
        const entryResponse = await axios.get('/api/calendar-entries', {
          params: {
            customer_id: customer.customer_id,
            delivery_date: date,
          },
        });

        // GET returns an array, so we need to get the first element
        const entries = entryResponse.data?.data;
        const orderId = entries && entries.length > 0 ? entries[0].order_id : null;

        // Delete the customer order (this will also cascade delete the calendar entry)
        if (orderId) {
          await axios.delete(`/api/customer-orders/${orderId}`);
          enqueueSnackbar('Extra tiffin order removed', { variant: 'info' });
        } else {
          // Fallback: just delete the calendar entry if no order found
          await axios.delete('/api/calendar-entries', {
            params: {
              customer_id: customer.customer_id,
              delivery_date: date,
            },
          });
          enqueueSnackbar('Extra tiffin removed', { variant: 'info' });
        }

        // Revert billing status if it was finalized
        await revertBillingIfFinalized(customer);

        onUpdate();
      } catch (error) {
        console.error('Error removing extra tiffin:', error);
        enqueueSnackbar('Failed to remove extra tiffin', { variant: 'error' });
      }
    }
  };

  // Handle double-click on non-plan days for extra tiffin
  const handleCellDoubleClick = (customer: ICalendarCustomerData, day: number, currentStatus: CalendarEntryStatus | null, isPlanDay: boolean) => {
    // Only allow double-click on non-plan days
    if (isPlanDay) {
      return;
    }

    // If already has status 'E', single-click handles removal, so ignore double-click
    if (currentStatus === 'E') {
      return;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Set data and show confirmation dialog
    setExtraOrderData({
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      delivery_date: date,
      order_id: 0, // Will be created
    });
    setOpenConfirmDialog(true);
  };

  const handleConfirmExtraTiffin = () => {
    setOpenConfirmDialog(false);
    setOpenExtraDialog(true);
  };

  const handleCancelExtraTiffin = () => {
    setOpenConfirmDialog(false);
    setExtraOrderData(null);
  };

  // Helper function to revert billing status if it was finalized
  const revertBillingIfFinalized = async (customer: ICalendarCustomerData) => {
    // Only revert if billing exists and is finalized or pending
    if (
      customer.billing_id &&
      (customer.billing_status === 'pending' || customer.billing_status === 'finalized')
    ) {
      try {
        await axios.put(`/api/monthly-billing/${customer.billing_id}`, {
          status: 'calculating',
        });
        // Note: onUpdate() will be called by the parent to refresh the data
      } catch (error) {
        console.error('Error reverting billing status:', error);
        // Don't show error to user - this is a background operation
      }
    }
  };

  const handleFinalize = async (customer: ICalendarCustomerData) => {
    if (!customer.billing_id) {
      enqueueSnackbar('No billing record found for this customer', { variant: 'warning' });
      return;
    }

    // Validate that all plan days have a status (T or A)
    const missingPlanDays: number[] = [];
    days.forEach((day) => {
      const isPlanDay = isDateCoveredByOrder(customer, day);
      const status = getStatusForDate(customer, day);

      if (isPlanDay && !status) {
        missingPlanDays.push(day);
      }
    });

    if (missingPlanDays.length > 0) {
      enqueueSnackbar(
        `Please mark all plan days before finalizing. Missing: ${missingPlanDays.join(', ')}`,
        { variant: 'warning' }
      );
      return;
    }

    setFinalizingCustomerId(customer.customer_id);

    try {
      const result = await dispatch(
        finalizeBilling(customer.billing_id, 'admin', `Finalized for ${customer.customer_name}`)
      );

      if (result.success) {
        enqueueSnackbar('Billing finalized successfully', { variant: 'success' });
        onUpdate();
      } else {
        enqueueSnackbar(result.error || 'Failed to finalize billing', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Failed to finalize billing', { variant: 'error' });
    } finally {
      setFinalizingCustomerId(null);
    }
  };

  const handleCreateExtraOrder = async () => {
    if (!extraOrderData || !selectedMealPlan || !extraPrice) {
      enqueueSnackbar('Please fill in all fields', { variant: 'warning' });
      return;
    }

    const priceValue = parseFloat(extraPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      enqueueSnackbar('Please enter a valid price', { variant: 'warning' });
      return;
    }

    try {
      // Determine the day of week for the selected date
      const deliveryDate = new Date(extraOrderData.delivery_date);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeek = dayNames[deliveryDate.getDay()];

      // Create a new order for the extra tiffin
      const orderResult = await axios.post('/api/customer-orders', {
        customer_id: extraOrderData.customer_id,
        meal_plan_id: selectedMealPlan,
        start_date: extraOrderData.delivery_date,
        end_date: extraOrderData.delivery_date,
        quantity: 1,
        price: priceValue,
        selected_days: [dayOfWeek], // Single day for extra tiffin
      });

      if (orderResult.data.success) {
        const newOrderId = orderResult.data.data.id;

        // Create the calendar entry with 'E' status
        const result = await dispatch(
          createCalendarEntry({
            customer_id: extraOrderData.customer_id,
            order_id: newOrderId,
            delivery_date: extraOrderData.delivery_date,
            status: 'E',
            quantity: 1,
            price: priceValue,
          })
        );

        if (result.success) {
          enqueueSnackbar('Extra tiffin order created successfully', { variant: 'success' });

          // Find the customer and revert billing if finalized
          const customer = customers.find((c) => c.customer_id === extraOrderData.customer_id);
          if (customer) {
            await revertBillingIfFinalized(customer);
          }

          setOpenExtraDialog(false);
          setExtraOrderData(null);
          setSelectedMealPlan(null);
          setExtraPrice('');
          onUpdate();
        } else {
          enqueueSnackbar(result.error || 'Failed to create calendar entry', { variant: 'error' });
        }
      } else {
        enqueueSnackbar('Failed to create extra order', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error creating extra order:', error);
      enqueueSnackbar('Failed to create extra order', { variant: 'error' });
    }
  };

  const getStatusForDate = (customer: ICalendarCustomerData, day: number): CalendarEntryStatus | null => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return customer.entries[date] || null;
  };

  const getBillingStatusColor = (status: string) => {
    switch (status) {
      case 'calculating':
        return 'warning';
      case 'pending':
        return 'primary';
      case 'finalized':
        return 'success';
      case 'paid':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Card>
      <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)', overflow: 'auto' }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <StyledHeaderCell>Customer</StyledHeaderCell>
              {days.map((day) => (
                <StyledHeaderCell key={day} sx={{ minWidth: 30, maxWidth: 30 }}>
                  <Stack spacing={0.25}>
                    <Typography variant="caption" fontWeight="bold" sx={{ fontSize: 10 }}>
                      {day}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 8 }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][getDayOfWeek(day)]}
                    </Typography>
                  </Stack>
                </StyledHeaderCell>
              ))}
              <StyledHeaderCell sx={{ fontSize: 10 }}>Summary</StyledHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.customer_id} hover>
                <StyledTableCell>
                  <Stack spacing={0.2} alignItems="flex-start">
                    <Typography
                      variant="caption"
                      fontWeight="600"
                      sx={{
                        fontSize: 10.5,
                        lineHeight: 1.3,
                        wordBreak: 'break-word',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {customer.customer_name}
                    </Typography>
                    {customer.customer_phone && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          fontSize: 7.5,
                          lineHeight: 1.2,
                          wordBreak: 'break-word',
                        }}
                      >
                        {customer.customer_phone}
                      </Typography>
                    )}
                  </Stack>
                </StyledTableCell>

                {days.map((day) => {
                  const status = getStatusForDate(customer, day);
                  const weekend = isWeekend(day);
                  const isPlanDay = isDateCoveredByOrder(customer, day);
                  const disabled = !isPlanDay && !status;

                  return (
                    <StyledTableCell key={day}>
                      <Tooltip
                        title={
                          isPlanDay
                            ? status
                              ? status === 'T'
                                ? 'Delivered - Click to mark Absent'
                                : status === 'A'
                                ? 'Absent - Click to clear'
                                : ''
                              : 'Plan day - Click to mark as Delivered'
                            : status === 'E'
                            ? 'Extra tiffin - Click to remove'
                            : 'Double-click to add extra tiffin'
                        }
                      >
                        <DayCell
                          status={status}
                          isWeekend={weekend}
                          disabled={disabled}
                          isPlanDay={isPlanDay}
                          onClick={() => handleCellClick(customer, day, status, isPlanDay)}
                          onDoubleClick={() => handleCellDoubleClick(customer, day, status, isPlanDay)}
                        >
                          {status || ''}
                        </DayCell>
                      </Tooltip>
                    </StyledTableCell>
                  );
                })}

                <StyledTableCell>
                  <Stack spacing={0.5} alignItems="center">
                    <Stack direction="row" spacing={0.5} justifyContent="center">
                      <Tooltip title="Delivered">
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold', fontSize: 9 }}>
                          T:{customer.total_delivered}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Absent">
                        <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold', fontSize: 9 }}>
                          A:{customer.total_absent}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Extra">
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'bold', fontSize: 9 }}>
                          E:{customer.total_extra}
                        </Typography>
                      </Tooltip>
                    </Stack>

                    <Typography variant="caption" fontWeight="700" color="primary" sx={{ fontSize: 11 }}>
                      CAD ${customer.total_amount.toFixed(2)}
                    </Typography>

                    {customer.billing_status === 'calculating' && (
                      <Button
                        size="small"
                        variant="outlined"
                        color="primary"
                        onClick={() => handleFinalize(customer)}
                        disabled={finalizingCustomerId === customer.customer_id}
                        startIcon={
                          finalizingCustomerId === customer.customer_id ? (
                            <CircularProgress size={12} />
                          ) : (
                            <Iconify icon="eva:checkmark-circle-fill" width={12} />
                          )
                        }
                        sx={{ minWidth: 70, fontSize: 9, py: 0.25 }}
                      >
                        Finalize
                      </Button>
                    )}

                    {customer.billing_status !== 'calculating' && (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 0.75,
                          py: 0.25,
                          borderRadius: 0.5,
                          fontSize: 9,
                          bgcolor: `${getBillingStatusColor(customer.billing_status)}.lighter`,
                          color: `${getBillingStatusColor(customer.billing_status)}.darker`,
                          textTransform: 'capitalize',
                        }}
                      >
                        {customer.billing_status}
                      </Typography>
                    )}
                  </Stack>
                </StyledTableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {customers.length === 0 && (
        <Box sx={{ p: 5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No customers found
          </Typography>
        </Box>
      )}

      {/* Confirmation Dialog for Extra Tiffin */}
      <Dialog open={openConfirmDialog} onClose={handleCancelExtraTiffin} maxWidth="xs" fullWidth>
        <DialogTitle>Add Extra Tiffin?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Do you want to add an extra tiffin for {extraOrderData?.customer_name} on{' '}
            {extraOrderData?.delivery_date}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelExtraTiffin} color="inherit">
            No
          </Button>
          <Button onClick={handleConfirmExtraTiffin} variant="contained" color="primary">
            Yes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Extra Tiffin Order Dialog */}
      <Dialog open={openExtraDialog} onClose={() => setOpenExtraDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Create Extra Tiffin Order
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {extraOrderData?.customer_name} - {extraOrderData?.delivery_date}
          </Typography>
        </DialogTitle>

        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            <TextField
              select
              fullWidth
              label="Select Meal Plan"
              value={selectedMealPlan || ''}
              onChange={(e) => setSelectedMealPlan(Number(e.target.value))}
            >
              {mealPlans.map((plan) => (
                <MenuItem key={plan.id} value={plan.id}>
                  {plan.meal_name} - CAD ${Number(plan.price).toFixed(2)}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              fullWidth
              label="Price (CAD $)"
              type="number"
              value={extraPrice}
              onChange={(e) => setExtraPrice(e.target.value)}
              placeholder="Auto-filled from meal plan"
              inputProps={{
                step: '0.01',
                min: '0',
                inputMode: 'decimal',
              }}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>,
              }}
              helperText="Price is auto-filled from selected meal plan. You can modify it if needed."
            />

            <Typography variant="caption" color="text.secondary">
              This will create a new order for the extra tiffin on the selected date and add it to the billing
              calculation.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenExtraDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={async () => {
              // Make the cell blank by deleting any existing entry
              if (extraOrderData) {
                try {
                  await axios.delete('/api/calendar-entries', {
                    params: {
                      customer_id: extraOrderData.customer_id,
                      delivery_date: extraOrderData.delivery_date,
                    },
                  });
                  enqueueSnackbar('Cell cleared', { variant: 'info' });
                  setOpenExtraDialog(false);
                  setExtraOrderData(null);
                  setSelectedMealPlan(null);
                  setExtraPrice('');
                  onUpdate();
                } catch (error) {
                  enqueueSnackbar('Failed to clear cell', { variant: 'error' });
                }
              }
            }}
            color="warning"
            variant="outlined"
          >
            Make Blank
          </Button>
          <Button onClick={handleCreateExtraOrder} variant="contained" color="primary">
            Create Order
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}
