import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
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
// local components
import CombinedInvoiceDialog from './CombinedInvoiceDialog';
import { PATH_DASHBOARD } from '../../../../routes/paths';

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
  onUpdate: () => void | Promise<void>;
}

export default function CalendarGrid({ year, month, customers, onUpdate }: CalendarGridProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();

  const [selectedCustomer, setSelectedCustomer] = useState<ICalendarCustomerData | null>(null);
  const [openFinalizeDialog, setOpenFinalizeDialog] = useState(false);
  const [finalizingCustomerId, setFinalizingCustomerId] = useState<number | null>(null);

  // Combined invoice dialog state
  const [openInvoiceDialog, setOpenInvoiceDialog] = useState(false);
  const [invoiceCustomer, setInvoiceCustomer] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Extra tiffin order dialog state
  const [openExtraDialog, setOpenExtraDialog] = useState(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState(false);
  const [extraOrderData, setExtraOrderData] = useState<{
    customer_id: number;
    customer_name: string;
    delivery_date: string;
    order_id: number;
    parent_order_id?: number; // Links extra tiffin to parent meal plan order
  } | null>(null);
  const [mealPlans, setMealPlans] = useState<any[]>([]);
  const [selectedMealPlan, setSelectedMealPlan] = useState<number | null>(null);
  const [extraPrice, setExtraPrice] = useState<string>('');

  // Processing lock to prevent duplicate execution of handleCellClick
  const processingRef = useRef<Set<string>>(new Set());

  // Fetch meal plans on component mount
  useEffect(() => {
    const fetchMealPlans = async () => {
      try {
        const response = await axios.get('/api/meal-plans');
        setMealPlans(response.data.data || []);
      } catch (error) {
        // Silently handle error
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

  // Check if a date is covered by any order for the customer
  const isDateCoveredByOrder = (customer: ICalendarCustomerData, day: number): boolean => {
    if (!customer.orders || customer.orders.length === 0) {
      return false;
    }

    // Use string format for reliable date comparison (YYYY-MM-DD)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Get day of week for selected_days check
    const currentDate = new Date(year, month - 1, day);
    const dayOfWeek = currentDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[dayOfWeek];

    return customer.orders.some((order) => {
      // Ensure order dates are properly formatted for comparison
      const orderStartDate = order.start_date?.split('T')[0] || order.start_date; // Handle datetime format
      const orderEndDate = order.end_date?.split('T')[0] || order.end_date; // Handle datetime format

      // String comparison for dates (YYYY-MM-DD format compares correctly)
      const isInDateRange = dateStr >= orderStartDate && dateStr <= orderEndDate;

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
    // Create unique key for this cell to prevent duplicate processing
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const cellKey = `${customer.customer_id}-${date}`;

    // Check if this cell is already being processed
    if (processingRef.current.has(cellKey)) {
      return;
    }

    // Block editing if billing is pending, finalized, or paid
    if (customer.billing_status && ['pending', 'finalized', 'paid'].includes(customer.billing_status)) {
      enqueueSnackbar(
        `Cannot modify calendar - billing is ${customer.billing_status}. Please reject or approve billing first.`,
        { variant: 'warning' }
      );
      return;
    }

    // Get customer's orders
    const orders = customer.orders || [];

    // Find an order that covers this date
    const activeOrder = orders.find((order) => {
      const orderStartDate = order.start_date?.split('T')[0] || order.start_date;
      const orderEndDate = order.end_date?.split('T')[0] || order.end_date;
      return date >= orderStartDate && date <= orderEndDate;
    });

    // For plan days: cycle through Blank → T → A → Blank
    if (isPlanDay && activeOrder) {
      // Add to processing set
      processingRef.current.add(cellKey);

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
          // Delete the entry to clear it - use order_id for specific order isolation
          await axios.delete('/api/calendar-entries', {
            params: {
              order_id: activeOrder.id,
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
        enqueueSnackbar('Failed to update entry', { variant: 'error' });
      } finally {
        // Remove from processing set
        processingRef.current.delete(cellKey);
      }

      return; // Exit early for plan days
    }

    // For non-plan days with 'E' status: remove the entry and delete the order
    if (!isPlanDay && currentStatus === 'E') {
      // Add to processing set
      processingRef.current.add(cellKey);

      try {
        // Get all orders for this customer in the current month
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const ordersResponse = await axios.get('/api/customer-orders', {
          params: {
            filter: 'monthly',
            month: monthStr,
          },
        });

        const allOrders = ordersResponse.data?.data?.orders || [];

        // Filter to find the extra tiffin order matching this exact date
        const customerOrders = allOrders.filter((order: any) => order.customer_id === customer.customer_id);

        // Extra tiffin orders are single-day orders with a parent_order_id
        const extraTiffinOrder = customerOrders.find((order: any) => {
          const orderStartDate = order.start_date?.split('T')[0] || order.start_date;
          const orderEndDate = order.end_date?.split('T')[0] || order.end_date;

          // Extra tiffins have:
          // 1. start_date === end_date (single day)
          // 2. Both dates match the clicked date
          // 3. parent_order_id is set (links to main order)
          return (
            orderStartDate === date &&
            orderEndDate === date &&
            order.parent_order_id != null &&
            order.parent_order_id > 0
          );
        });

        if (extraTiffinOrder) {
          const deleteResult = await axios.delete(`/api/customer-orders/${extraTiffinOrder.id}`);

          if (deleteResult.data?.success) {
            // Also delete the calendar entry
            // The entry's order_id is set to parent_order_id, not the extra order's ID
            try {
              const calendarDeleteResult = await axios.delete('/api/calendar-entries', {
                params: {
                  order_id: extraTiffinOrder.parent_order_id, // Calendar entry uses parent order ID
                  customer_id: customer.customer_id,
                  delivery_date: date,
                },
              });
            } catch (calendarError: any) {
              // Continue anyway - order is already deleted
            }

            enqueueSnackbar('Extra tiffin order removed', { variant: 'success' });

            // Revert billing status if it was finalized
            await revertBillingIfFinalized(customer);

            // Explicitly recalculate billing to ensure accurate data
            // This calls sp_calculate_monthly_billing stored procedure
            try {
              const billingMonth = `${year}-${String(month).padStart(2, '0')}`;
              enqueueSnackbar('Recalculating billing...', { variant: 'info' });

              const recalcResult = await axios.post('/api/monthly-billing', {
                customer_id: customer.customer_id,
                billing_month: billingMonth,
              });

              if (recalcResult.data?.success) {
                // Billing successfully recalculated, now refresh UI
                onUpdate();
              } else {
                enqueueSnackbar('Billing recalculation failed - refreshing anyway', { variant: 'warning' });
                onUpdate();
              }
            } catch (recalcError: any) {
              enqueueSnackbar('Error recalculating billing - refreshing anyway', { variant: 'warning' });
              onUpdate();
            }
          } else {
            enqueueSnackbar('Failed to remove order: ' + (deleteResult.data?.error || 'Unknown error'), { variant: 'error' });
          }
        } else {
          // If no extra order found, it might have been a manually created calendar entry
          enqueueSnackbar('No extra tiffin order found to remove', { variant: 'warning' });
        }
      } catch (error: any) {
        const errorMsg = error.response?.data?.error || error.message || 'Failed to remove extra tiffin';
        enqueueSnackbar(errorMsg, { variant: 'error' });
      } finally {
        // Remove from processing set
        processingRef.current.delete(cellKey);
      }

      return; // Exit early for extra tiffin removal
    }
  };

  // Handle double-click on non-plan days for extra tiffin
  const handleCellDoubleClick = (customer: ICalendarCustomerData, day: number, currentStatus: CalendarEntryStatus | null, isPlanDay: boolean) => {
    // Block editing if billing is pending, finalized, or paid
    if (customer.billing_status && ['pending', 'finalized', 'paid'].includes(customer.billing_status)) {
      enqueueSnackbar(
        `Cannot add extra tiffin - billing is ${customer.billing_status}. Please reject or approve billing first.`,
        { variant: 'warning' }
      );
      return;
    }

    // Only allow double-click on non-plan days
    if (isPlanDay) {
      return;
    }

    // If already has status 'E', single-click handles removal, so ignore double-click
    if (currentStatus === 'E') {
      return;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Each row now represents ONE order, so use that order as the parent
    // The extra tiffin will appear in this order's row in the billing calendar
    const parentOrder = customer.orders && customer.orders.length > 0 ? customer.orders[0] : null;
    const parentOrderId = parentOrder?.id;

    // Set data and show confirmation dialog
    setExtraOrderData({
      customer_id: customer.customer_id,
      customer_name: customer.customer_name,
      delivery_date: date,
      order_id: 0, // Will be created
      parent_order_id: parentOrderId,
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
      } catch (error: any) {
        // Silently ignore errors - billing record might not exist
        // This is a background operation, no need to log or show to user
      }
    }
  };

  const handleFinalize = async (customer: ICalendarCustomerData) => {
    // Get the order for this row
    const order = customer.orders && customer.orders.length > 0 ? customer.orders[0] : null;
    if (!order) {
      enqueueSnackbar('No order found for this row', { variant: 'warning' });
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
      // Call the order-billing finalize API (per-order finalization)
      const billingMonth = `${year}-${String(month).padStart(2, '0')}`;
      const response = await axios.post('/api/order-billing/finalize', {
        order_id: order.id,
        billing_month: billingMonth,
        finalized_by: 'admin',
      });

      if (response.data.success) {
        const { all_orders_finalized, total_orders, finalized_orders } = response.data.data;

        if (all_orders_finalized) {
          enqueueSnackbar(
            `Order finalized! All ${total_orders} orders for ${customer.customer_name} are now finalized.`,
            { variant: 'success' }
          );
        } else {
          enqueueSnackbar(
            `Order finalized! ${finalized_orders}/${total_orders} orders finalized for ${customer.customer_name}.`,
            { variant: 'success' }
          );
        }

        // Refresh the UI
        await onUpdate();
        setFinalizingCustomerId(null);
      } else {
        enqueueSnackbar(response.data.error || 'Failed to finalize order', { variant: 'error' });
        setFinalizingCustomerId(null);
      }
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.error || 'Failed to finalize order', { variant: 'error' });
      setFinalizingCustomerId(null);
    }
  };

  const handleViewInvoice = (customer: ICalendarCustomerData) => {
    setInvoiceCustomer({
      id: customer.customer_id,
      name: customer.customer_name,
    });
    setOpenInvoiceDialog(true);
  };

  const handleViewOrderInvoice = (customer: ICalendarCustomerData) => {
    const order = customer.orders && customer.orders.length > 0 ? customer.orders[0] : null;
    if (!order) {
      enqueueSnackbar('No order found', { variant: 'warning' });
      return;
    }

    // Navigate to the new order invoice page
    const billingMonth = `${year}-${String(month).padStart(2, '0')}`;
    router.push({
      pathname: '/dashboard/tiffin/order-invoice-details',
      query: {
        orderId: order.id,
        month: billingMonth,
      },
    });
  };

  const handleInvoiceApproved = () => {
    onUpdate(); // Refresh the calendar after invoice approval
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

      // IMPORTANT: Delete any existing calendar entry for this date first
      // This ensures we start with a clean state and the new order_id is correctly set
      // Use parent_order_id to only delete entries for this specific parent order
      try {
        await axios.delete('/api/calendar-entries', {
          params: {
            order_id: extraOrderData.parent_order_id,
            customer_id: extraOrderData.customer_id,
            delivery_date: extraOrderData.delivery_date,
          },
        });
      } catch (deleteError) {
        // Ignore error if entry doesn't exist
      }

      // Create a new order for the extra tiffin
      // Link to parent order if one exists for proper grouping
      const orderResult = await axios.post('/api/customer-orders', {
        customer_id: extraOrderData.customer_id,
        meal_plan_id: selectedMealPlan,
        start_date: extraOrderData.delivery_date,
        end_date: extraOrderData.delivery_date,
        quantity: 1,
        price: priceValue,
        selected_days: [dayOfWeek], // Single day for extra tiffin
        parent_order_id: extraOrderData.parent_order_id || null, // Link to parent meal plan
      });

      if (orderResult.data.success) {
        const newOrderId = orderResult.data.data.id;
        // Use parent_order_id for the calendar entry so it appears in the parent order's row
        const entryOrderId = extraOrderData.parent_order_id || newOrderId;

        // Create the calendar entry with 'E' status
        // Use parent_order_id so the entry appears in the parent order's row in the billing calendar
        const result = await dispatch(
          createCalendarEntry({
            customer_id: extraOrderData.customer_id,
            order_id: entryOrderId,
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
            {customers.map((customer, index) => {
              // Get the order for this row (now each row represents one order)
              const order = customer.orders && customer.orders.length > 0 ? customer.orders[0] : null;
              // Use order ID + customer ID + index for unique key (same customer can have multiple orders)
              const rowKey = order ? `${customer.customer_id}-${order.id}` : `${customer.customer_id}-${index}`;

              return (
              <TableRow key={rowKey} hover>
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
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {customer.customer_name}
                    </Typography>
                    {order?.meal_plan_name && (
                      <Typography
                        variant="caption"
                        color="primary.main"
                        sx={{
                          fontSize: 8,
                          lineHeight: 1.2,
                          wordBreak: 'break-word',
                          fontWeight: 500,
                        }}
                      >
                        {order.meal_plan_name}
                      </Typography>
                    )}
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
                  const isLocked = customer.billing_status && ['pending', 'finalized', 'paid'].includes(customer.billing_status);
                  const disabled = !isPlanDay && !status;

                  return (
                    <StyledTableCell key={day}>
                      <Tooltip
                        title={
                          isLocked
                            ? `Billing ${customer.billing_status} - editing locked`
                            : isPlanDay
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
                          disabled={disabled || isLocked}
                          isPlanDay={isPlanDay}
                          onClick={() => handleCellClick(customer, day, status, isPlanDay)}
                          onDoubleClick={() => handleCellDoubleClick(customer, day, status, isPlanDay)}
                          sx={isLocked ? {
                            opacity: 0.6,
                            cursor: 'not-allowed !important',
                            pointerEvents: 'auto'
                          } : {}}
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
                      <Stack spacing={0.5} alignItems="center">
                        <Stack direction="row" spacing={0.5} alignItems="center">
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
                        </Stack>
                        <Stack direction="row" spacing={0.25}>
                          <Tooltip title="View Order Invoice">
                            <IconButton
                              size="small"
                              onClick={() => handleViewOrderInvoice(customer)}
                              sx={{ p: 0.25 }}
                            >
                              <Iconify icon="eva:file-outline" width={14} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="View Combined Invoice">
                            <IconButton
                              size="small"
                              onClick={() => handleViewInvoice(customer)}
                              sx={{ p: 0.25 }}
                            >
                              <Iconify icon="eva:layers-outline" width={14} />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    )}
                  </Stack>
                </StyledTableCell>
              </TableRow>
              );
            })}
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
              helperText="Only showing meal plans with frequency='Daily' and days='Single'"
            >
              {mealPlans
                .filter((plan) => plan.frequency === 'Daily' && plan.days === 'Single')
                .map((plan) => (
                  <MenuItem key={plan.id} value={plan.id}>
                    {plan.meal_name} - CAD ${Number(plan.price).toFixed(2)}
                  </MenuItem>
                ))}
              {mealPlans.filter((plan) => plan.frequency === 'Daily' && plan.days === 'Single').length === 0 && (
                <MenuItem disabled>No Daily/Single meal plans available</MenuItem>
              )}
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
              // Use parent_order_id to only delete entries for this specific order
              if (extraOrderData) {
                try {
                  await axios.delete('/api/calendar-entries', {
                    params: {
                      order_id: extraOrderData.parent_order_id,
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

      {/* Combined Invoice Dialog */}
      {invoiceCustomer && (
        <CombinedInvoiceDialog
          open={openInvoiceDialog}
          onClose={() => {
            setOpenInvoiceDialog(false);
            setInvoiceCustomer(null);
          }}
          customerId={invoiceCustomer.id}
          customerName={invoiceCustomer.name}
          billingMonth={`${year}-${String(month).padStart(2, '0')}`}
          onApproved={handleInvoiceApproved}
        />
      )}

    </Card>
  );
}
