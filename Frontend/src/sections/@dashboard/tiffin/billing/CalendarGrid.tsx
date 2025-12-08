import { useState } from 'react';
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
  padding: theme.spacing(0.5),
  textAlign: 'center',
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:first-of-type': {
    position: 'sticky',
    left: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
    minWidth: 180,
    maxWidth: 180,
    borderRight: `2px solid ${theme.palette.divider}`,
  },
  '&:last-child': {
    position: 'sticky',
    right: 0,
    backgroundColor: theme.palette.background.paper,
    zIndex: 2,
    minWidth: 120,
    borderLeft: `2px solid ${theme.palette.divider}`,
  },
}));

const StyledHeaderCell = styled(TableCell)(({ theme }) => ({
  padding: theme.spacing(1),
  textAlign: 'center',
  fontWeight: 'bold',
  backgroundColor: theme.palette.grey[200],
  borderRight: `1px solid ${theme.palette.divider}`,
  '&:first-of-type': {
    position: 'sticky',
    left: 0,
    zIndex: 3,
    minWidth: 180,
    maxWidth: 180,
    borderRight: `2px solid ${theme.palette.divider}`,
  },
  '&:last-child': {
    position: 'sticky',
    right: 0,
    zIndex: 3,
    minWidth: 120,
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
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: disabled ? 'not-allowed' : 'pointer',
  borderRadius: theme.spacing(0.5),
  fontSize: 12,
  fontWeight: 'bold',
  transition: 'all 0.2s',
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
        transform: 'scale(1.1)',
        boxShadow: theme.shadows[4],
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

      const result = await dispatch(
        createCalendarEntry({
          customer_id: customer.customer_id,
          order_id: activeOrder.id,
          delivery_date: date,
          status: newStatus,
          quantity: 1,
          price: newStatus === 'E' ? 60 : 50, // Default prices (will be updated with new logic)
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

  const getStatusForDate = (customer: ICalendarCustomerData, day: number): CalendarEntryStatus | null => {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    // Check for the date in entries - handle both string and date object formats
    for (const [entryDate, status] of Object.entries(customer.entries)) {
      const normalizedDate = entryDate.split('T')[0]; // Remove time part if present
      if (normalizedDate === date) {
        return status as CalendarEntryStatus;
      }
    }
    return null;
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
              <StyledHeaderCell>Customer Name</StyledHeaderCell>
              {days.map((day) => (
                <StyledHeaderCell key={day} sx={{ minWidth: 40 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="caption" fontWeight="bold">
                      {day}
                    </Typography>
                    <Typography variant="caption" sx={{ fontSize: 9 }}>
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][getDayOfWeek(day)]}
                    </Typography>
                  </Stack>
                </StyledHeaderCell>
              ))}
              <StyledHeaderCell>Summary</StyledHeaderCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.customer_id} hover>
                <StyledTableCell>
                  <Stack spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2" fontWeight="600">
                      {customer.customer_name}
                    </Typography>
                    {customer.customer_phone && (
                      <Typography variant="caption" color="text.secondary">
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
                  <Stack spacing={1} alignItems="center">
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Tooltip title="Delivered">
                        <Typography variant="caption" sx={{ color: 'success.main', fontWeight: 'bold' }}>
                          T: {customer.total_delivered}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Absent">
                        <Typography variant="caption" sx={{ color: 'grey.600', fontWeight: 'bold' }}>
                          A: {customer.total_absent}
                        </Typography>
                      </Tooltip>
                      <Tooltip title="Extra">
                        <Typography variant="caption" sx={{ color: 'info.main', fontWeight: 'bold' }}>
                          E: {customer.total_extra}
                        </Typography>
                      </Tooltip>
                    </Stack>

                    <Typography variant="body2" fontWeight="700" color="primary">
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
                            <CircularProgress size={16} />
                          ) : (
                            <Iconify icon="eva:checkmark-circle-fill" width={16} />
                          )
                        }
                        sx={{ minWidth: 100, fontSize: 11 }}
                      >
                        Finalize
                      </Button>
                    )}

                    {customer.billing_status !== 'calculating' && (
                      <Typography
                        variant="caption"
                        sx={{
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
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
    </Card>
  );
}
