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
    minWidth: 140,
    maxWidth: 140,
    borderRight: `2px solid ${theme.palette.divider}`,
    textAlign: 'left',
    paddingLeft: theme.spacing(1),
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
    minWidth: 140,
    maxWidth: 140,
    borderRight: `2px solid ${theme.palette.divider}`,
    textAlign: 'left',
    paddingLeft: theme.spacing(1),
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
  isWeekend: boolean;
  disabled?: boolean;
}

const DayCell = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'status' && prop !== 'isWeekend' && prop !== 'disabled',
})<DayCellProps>(({ theme, status, isWeekend, disabled }) => ({
  width: 24,
  height: 24,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  borderRadius: theme.spacing(0.5),
  fontSize: 10,
  fontWeight: 'bold',
  transition: 'all 0.15s',
  opacity: disabled ? 0.3 : 1,
  backgroundColor: disabled
    ? alpha(theme.palette.grey[300], 0.2)
    : !status
    ? isWeekend
      ? alpha(theme.palette.grey[300], 0.3)
      : 'transparent'
    : status === 'T'
    ? theme.palette.success.main
    : status === 'A'
    ? theme.palette.grey[400]
    : theme.palette.info.main,
  color: disabled ? theme.palette.text.disabled : status ? 'white' : theme.palette.text.primary,
  border: `1px solid ${theme.palette.divider}`,
  '&:hover': disabled
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

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(date);

    return customer.orders.some((order) => {
      const startDate = new Date(order.start_date);
      const endDate = new Date(order.end_date);
      return currentDate >= startDate && currentDate <= endDate;
    });
  };

  const handleCellClick = async (
    customer: ICalendarCustomerData,
    day: number,
    currentStatus: CalendarEntryStatus | null,
    isDisabled: boolean
  ) => {
    // Don't allow clicks on disabled dates
    if (isDisabled) {
      return;
    }

    // Get customer's orders
    const orders = customer.orders || [];

    if (orders.length === 0) {
      enqueueSnackbar('No active orders found for this customer.', {
        variant: 'warning',
      });
      return;
    }

    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    // Find an order that covers this date
    const activeOrder = orders.find((order) => {
      const startDate = new Date(order.start_date);
      const endDate = new Date(order.end_date);
      const currentDate = new Date(date);
      return currentDate >= startDate && currentDate <= endDate;
    });

    if (!activeOrder) {
      enqueueSnackbar('No order covers this date.', {
        variant: 'warning',
      });
      return;
    }

    // Cycle through statuses: null -> T -> A -> E -> null
    let newStatus: CalendarEntryStatus | null = null;

    if (currentStatus === null) {
      newStatus = 'T';
    } else if (currentStatus === 'T') {
      newStatus = 'A';
    } else if (currentStatus === 'A') {
      newStatus = 'E';
    } else {
      newStatus = null; // E -> null (clear entry)
    }

    try {
      if (newStatus === null) {
        // Delete the calendar entry
        const deleteResult = await axios.delete('/api/calendar-entries', {
          params: {
            customer_id: customer.customer_id,
            delivery_date: date,
          },
        });

        if (deleteResult.data.success) {
          enqueueSnackbar('Entry cleared', { variant: 'info' });
        } else {
          enqueueSnackbar('Failed to clear entry', { variant: 'error' });
        }
        onUpdate(); // Refresh the calendar
        return;
      }

      // If marking as Extra, show dialog to create a new order
      if (newStatus === 'E') {
        setExtraOrderData({
          customer_id: customer.customer_id,
          customer_name: customer.customer_name,
          delivery_date: date,
          order_id: activeOrder.id,
        });
        setOpenExtraDialog(true);
        return;
      }

      // For T and A, create entry directly
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
        enqueueSnackbar(`Marked as ${newStatus === 'T' ? 'Delivered' : newStatus === 'A' ? 'Absent' : 'Extra'}`, {
          variant: 'success'
        });
        onUpdate(); // Refresh the calendar
      } else {
        enqueueSnackbar(result.error || 'Failed to update entry', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error updating calendar entry:', error);
      enqueueSnackbar('Failed to update entry', { variant: 'error' });
    }
  };

  const handleFinalize = async (customer: ICalendarCustomerData) => {
    if (!customer.billing_id) {
      enqueueSnackbar('No billing record found for this customer', { variant: 'warning' });
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
      // Create a new order for the extra tiffin
      const orderResult = await axios.post('/api/customer-orders', {
        customer_id: extraOrderData.customer_id,
        meal_plan_id: selectedMealPlan,
        start_date: extraOrderData.delivery_date,
        end_date: extraOrderData.delivery_date,
        quantity: 1,
        price: priceValue,
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
                  <Stack spacing={0.25} alignItems="flex-start">
                    <Typography variant="caption" fontWeight="600" sx={{ fontSize: 11 }}>
                      {customer.customer_name}
                    </Typography>
                    {customer.customer_phone && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>
                        {customer.customer_phone}
                      </Typography>
                    )}
                  </Stack>
                </StyledTableCell>

                {days.map((day) => {
                  const status = getStatusForDate(customer, day);
                  const weekend = isWeekend(day);
                  const isCovered = isDateCoveredByOrder(customer, day);
                  const disabled = !isCovered;

                  return (
                    <StyledTableCell key={day}>
                      <Tooltip
                        title={
                          disabled
                            ? 'No order for this date'
                            : status
                            ? status === 'T'
                              ? 'Delivered'
                              : status === 'A'
                              ? 'Absent'
                              : 'Extra'
                            : 'Click to mark'
                        }
                      >
                        <DayCell
                          status={status}
                          isWeekend={weekend}
                          disabled={disabled}
                          onClick={() => handleCellClick(customer, day, status, disabled)}
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
                        <Typography variant="caption" sx={{ color: 'grey.600', fontWeight: 'bold', fontSize: 9 }}>
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
              placeholder="Enter price for extra tiffin"
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>CAD $</Typography>,
              }}
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
